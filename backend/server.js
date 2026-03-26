// 1. Bring in the required libraries
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { getEbdPrescription } = require("./ebdEngine");

// 2. Create basic Express app and HTTP server
const app = express();
const server = http.createServer(app);

// 3. Attach Socket.IO to the server
const io = new Server(server);

// 4. Redirect root to login page — auth entry point
app.get('/', (req, res) => res.redirect('/login.html'));

// 5. COOP header — required for Google Identity Services popup flow.
//    Without this, Chrome blocks the OAuth popup from posting the
//    credential token back to the opener window.
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  next();
});

// 6. Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

const DEBOUNCE_MS = 800;  // wait before reacting (reduced for faster response)
const HOLD_MS = 2000;     // stay in one state (reduced from 3s to 2s)

// ========================================
// 🏥 MULTI-USER SESSION MANAGEMENT SYSTEM
// ========================================
// Individual session tracking for simultaneous users
const userSessions = new Map();

// Default user preferences for new sessions
const defaultUserPreferences = { comfortMode: false, fullAR: true };

// ========================================
// 🎯 PER-USER SAFE EMIT FUNCTION
// ========================================
// Sends AR commands to individual users, not broadcast to all
function safeEmit(socket, command) {
  const now = Date.now();
  const session = userSessions.get(socket.id);

  if (!session) {
    console.warn("⚠️ No session found for socket:", socket.id);
    return;
  }

  console.log(`📡 Processing command for user ${socket.id}:`, command.state);

  // emergency → send immediately to THIS user only
  if (command.state === "BRADYCARDIA_ALERT") {
    socket.emit("ar:command", command);
    session.lastState = command.state;
    session.lastHR = command.vitals.hr;
    session.lastHRV = command.vitals.hrv;
    session.lastTime = now;
    console.log(`🚨 EMERGENCY sent to user ${socket.id}`);
    return;
  }

  // same state AND same vitals for THIS user → do nothing
  if (
    command.state === session.lastState &&
    command.vitals.hr === session.lastHR &&
    command.vitals.hrv === session.lastHRV
  ) {
    console.log(`⏸️ Duplicate state for user ${socket.id}, skipping`);
    return;
  }

  // too soon for THIS user → wait
  if (now - session.lastTime < HOLD_MS) {
    clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      socket.emit("ar:command", command);
      session.lastState = command.state;
      session.lastHR = command.vitals.hr;
      session.lastHRV = command.vitals.hrv;
      session.lastTime = Date.now();
      console.log(`⏰ Delayed command sent to user ${socket.id}:`, command.state);
    }, DEBOUNCE_MS);
    console.log(`⌛ Command debounced for user ${socket.id}`);
    return;
  }

  // normal case - send to THIS user only
  socket.emit("ar:command", command);
  session.lastState = command.state;
  session.lastHR = command.vitals.hr;
  session.lastHRV = command.vitals.hrv;
  session.lastTime = now;
  console.log(`✅ Command sent to user ${socket.id}:`, command.state);
}

// ========================================
// 🔌 MULTI-USER CONNECTION HANDLER
// ========================================
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Create individual session for this user
  userSessions.set(socket.id, {
    lastState: null,
    lastHR: null,
    lastHRV: null,
    lastTime: 0,
    timer: null,
    linkedDevice: null, // PRIVACY FIX: Track which hardware device is linked to this session
    userPreferences: { ...defaultUserPreferences } // Individual copy
  });

  console.log(`🆕 Created session for user ${socket.id}. Active sessions: ${userSessions.size}`);

  // ========================================
  // 🔗 IOT DEVICE PAIRING (The Privacy Fix)
  // ========================================
  socket.on("claim_device", (deviceId) => {
    const session = userSessions.get(socket.id);
    if (session) {
      session.linkedDevice = deviceId;
      console.log(`🔗 DEVICE PAIRED: Phone ${socket.id} claimed watch ${deviceId}`);
    }
  });

  socket.on("bio:update", ({ hr, hrv, userPalette, sessionContext }) => {
    console.log(`🔍 Backend received from ${socket.id}:`, { hr, hrv, userPalette, sessionContext });

    const session = userSessions.get(socket.id);
    if (!session) {
      console.warn("⚠️ Session not found for user:", socket.id);
      return;
    }

    // Use individual user preferences for this specific user
    const fullSessionContext = sessionContext || {
      interventionTrigger: 'PATIENT_INITIATED',
      userPreferences: session.userPreferences, // Use THIS user's preferences
      patientAnxietyLevel: 5 // Default moderate
    };

    // Save user's individual preferences (not global!)
    if (sessionContext && sessionContext.userPreferences) {
      session.userPreferences = { ...sessionContext.userPreferences };
      console.log(`💾 Saved user ${socket.id} preference:`, session.userPreferences);
    }

    const command = getEbdPrescription(hr, hrv, userPalette, fullSessionContext);

    console.log(`📤 Backend sending to ${socket.id}:`, JSON.stringify(command, null, 2));

    // Send command only to THIS specific user
    safeEmit(socket, command);
  });

  // Cleanup individual session when user disconnects
  socket.on("disconnect", () => {
    const session = userSessions.get(socket.id);
    if (session && session.timer) {
      clearTimeout(session.timer);
    }
    userSessions.delete(socket.id);
    console.log(`❌ User ${socket.id} disconnected. Active sessions: ${userSessions.size}`);
  });
});

// ========================================
// ⌚ HARDWARE BRIDGE: TIZEN WATCH LISTENER
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all('/hr', (req, res) => {
    let hrValue = req.query.hr || req.query.heartrate || req.body.hr || req.body.heartrate;
    let deviceId = req.query.deviceId || req.body.deviceId || 'default_tizen'; // Identify the watch

    if (!hrValue && Object.keys(req.body).length > 0) hrValue = Object.keys(req.body)[0];

    if (hrValue) {
        const liveHR = parseInt(hrValue, 10);
        console.log(`🫀 [WATCH LIVE] Heart Rate: ${liveHR} BPM from ${deviceId}`);

        // PRIVACY FIX: Route to the correct user, not everyone
        // Auto-link the device to the first eligible session so live updates reach the AR client.
        let targetSessionId = null;

        for (const [socketId, session] of userSessions.entries()) {
            if (session.linkedDevice === deviceId) {
                targetSessionId = socketId;
                break;
            }
        }

        if (!targetSessionId) {
            if (userSessions.size === 1) {
                targetSessionId = userSessions.keys().next().value;
                console.log(`🔗 Solo session ${targetSessionId} assumed for device ${deviceId}`);
            } else {
                for (const [socketId, session] of userSessions.entries()) {
                    if (!session.linkedDevice) {
                        session.linkedDevice = deviceId;
                        targetSessionId = socketId;
                        console.log(`🔗 Auto-claiming device ${deviceId} for session ${socketId}`);
                        break;
                    }
                }
            }
        }

        if (targetSessionId) {
            const socket = io.sockets.sockets.get(targetSessionId);
            const session = userSessions.get(targetSessionId);
            if (socket && session) {
                if (!session.linkedDevice) {
                    session.linkedDevice = deviceId;
                }
                const sessionContext = {
                    interventionTrigger: 'MONITORING',
                    userPreferences: session.userPreferences,
                    patientAnxietyLevel: 0
                };
                const command = getEbdPrescription(liveHR, 0, session.userPreferences.palette || 'DEFAULT', sessionContext);
                safeEmit(socket, command);
            }
        } else {
            console.warn(`⚠️ No eligible session found for device ${deviceId}`);
        }

        res.status(200).send('OK');
    } else {
        res.status(400).send('Awaiting HR data');
    }
});

// =====================================================
// ⌚ LIVE WATCH BRIDGE: HYPERATE WEBSOCKET
// =====================================================
const WebSocket = require('ws');

const HYPERATE_SESSION = '5038D';
const HYPERATE_TOKEN   = 'Q5Ag4eAQBL4VJqG33DK3FPyItfEHsmgmVp1z9kk7';

function connectHypeRate() {
    const hrSocket = new WebSocket(
        `wss://app.hyperate.io/socket/websocket?token=${HYPERATE_TOKEN}&vsn=2.0.0`
    );

    hrSocket.on('open', () => {
        console.log(`✅ HypeRate connected — watching: ${HYPERATE_SESSION}`);
        hrSocket.send(JSON.stringify({
            "topic": `hr:${HYPERATE_SESSION}`,
            "event": "phx_join",
            "payload": {},
            "ref": 0
        }));
        // Phoenix heartbeat — required every 10 seconds
        const hb = setInterval(() => {
            if (hrSocket.readyState === WebSocket.OPEN) {
                hrSocket.send(JSON.stringify({
                    "topic": "phoenix", "event": "heartbeat",
                    "payload": {}, "ref": 0
                }));
            } else {
                clearInterval(hb);
            }
        }, 10000);
    });

    hrSocket.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.event === 'hr_update') {
                const hr = msg.payload.hr;
                console.log(`❤️ LIVE HR: ${hr} BPM from HypeRate: ${HYPERATE_SESSION}`);

                // PRIVACY FIX: Route to the correct user
                userSessions.forEach((session, socketId) => {
                    // Only send if this user claimed the HypeRate watch, or if it's a solo demo
                    if (session.linkedDevice === HYPERATE_SESSION || userSessions.size === 1) {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            const sessionContext = {
                                interventionTrigger: 'MONITORING',
                                userPreferences: session.userPreferences,
                                patientAnxietyLevel: 0 
                            };
                            
                            // Get the patient's actual chosen palette from their session, not a hardcoded 'AMBER'
                            const userPalette = session.userPreferences.palette || 'OCEAN';
                            const command = getEbdPrescription(hr, 0, userPalette, sessionContext);
                            safeEmit(socket, command);
                        }
                    }
                });
            }
        } catch (e) {}
    });

    hrSocket.on('error', (err) => {
        console.error('❌ HypeRate error:', err.message);
    });

    hrSocket.on('close', (code) => {
        console.warn(`⚠️ HypeRate closed (code: ${code}). Retrying in 30s...`);
        setTimeout(connectHypeRate, 30000); // auto-reconnect
    });
}

connectHypeRate();


// 8. Start the server (Cloud-Ready)
const PORT = process.env.PORT || 3001;  // Changed from 3000 to 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 Therapeutic WebAR Server running on port ${PORT}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  console.log(`🌐 Ready for cloud deployment!`);
});
