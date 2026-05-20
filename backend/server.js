// Load server dependencies.
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { getEbdPrescription } = require("./ebdEngine");


// Create the Express app and HTTP server.
const app = express();
const server = http.createServer(app);

// Attach Socket.IO.
const io = new Server(server);

// Send the root route to the login page.
app.get('/', (req, res) => res.redirect('/login.html'));

// Set the COOP header needed for the Google sign-in popup.

app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  next();
});

// Serve the frontend files.
app.use(express.static(path.join(__dirname, "../frontend")));

// Timers for smoothing out the HR data stream
const DEBOUNCE_MS = 800;  // wait slightly before updating to avoid flickering
const HOLD_MS = 2000;     // force the current state to hold for at least 2 seconds


// Session Tracking
// Store per-user session data for multiple active clients.
const userSessions = new Map();

// Default preferences for a new session.
const defaultUserPreferences = { comfortMode: false, fullAR: true };

// Rate-limit state emissions to prevent client UI flickering
function safeEmit(socket, command) {
  const now = Date.now();
  const session = userSessions.get(socket.id);

  if (!session) {
    return;
  }

  // Bypass timers for high-priority clinical alerts
  if (command.state === "BRADYCARDIA_ALERT") {
    socket.emit("ar:command", command);
    session.lastState = command.state;
    session.lastHR = command.vitals.hr;
    session.lastHRV = command.vitals.hrv;
    session.lastTime = now;
    return;
  }

  // Drop redundant state payloads to save bandwidth
  if (
    command.state === session.lastState &&
    command.vitals.hr === session.lastHR &&
    command.vitals.hrv === session.lastHRV
  ) {
    return;
  }

  // Enforce minimum hold duration (HOLD_MS) via debounce
  if (now - session.lastTime < HOLD_MS) {
    clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      socket.emit("ar:command", command);
      session.lastState = command.state;
      session.lastHR = command.vitals.hr;
      session.lastHRV = command.vitals.hrv;
      session.lastTime = Date.now();
    }, DEBOUNCE_MS);
    return;
  }

  // Unthrottled emission path
  socket.emit("ar:command", command);
  session.lastState = command.state;
  session.lastHR = command.vitals.hr;
  session.lastHRV = command.vitals.hrv;
  session.lastTime = now;
}


// Socket Connections

io.on("connection", (socket) => {

  // Create a fresh session record for this socket.
  userSessions.set(socket.id, {
    lastState: null,
    lastHR: null,
    lastHRV: null,
    lastTime: 0,
    timer: null,
    linkedDevice: null, // Keep track of the watch linked to this session.
    userPreferences: { ...defaultUserPreferences } // Use a separate copy per user.
  });


 
  // Device Pairing
 
  socket.on("claim_device", (deviceId) => {
    const session = userSessions.get(socket.id);
    if (session) {
      session.linkedDevice = deviceId;
      switchHypeRateSession(deviceId);
    }
  });


  socket.on("bio:update", ({ hr, hrv, userPalette, sessionContext }) => {

    const session = userSessions.get(socket.id);
    if (!session) {
      console.warn("⚠️ Session not found for user:", socket.id);
      return;
    }

    // Fall back to the saved session preferences when needed.
    const fullSessionContext = sessionContext || {
      interventionTrigger: 'PATIENT_INITIATED',
      userPreferences: session.userPreferences, // Reuse this user's saved preferences.
      patientAnxietyLevel: 5 // Default to a moderate level.
    };

    // Save the latest preferences back to the session.
    if (sessionContext && sessionContext.userPreferences) {
      session.userPreferences = { ...sessionContext.userPreferences };
    }

    const command = getEbdPrescription(hr, hrv, userPalette, fullSessionContext);


    // Reply to this user only.
    safeEmit(socket, command);
  });

  // Clear the session record on disconnect.
  socket.on("disconnect", () => {
    const session = userSessions.get(socket.id);
    if (session && session.timer) {
      clearTimeout(session.timer);
    }
    userSessions.delete(socket.id);
  });
});


// Tizen Watch Listener

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all('/hr', (req, res) => {
    let hrValue = req.query.hr || req.query.heartrate || req.body.hr || req.body.heartrate;
    let deviceId = req.query.deviceId || req.body.deviceId || 'default_tizen'; // Identify the source watch.

    if (!hrValue && Object.keys(req.body).length > 0) hrValue = Object.keys(req.body)[0];

    if (hrValue) {
        const liveHR = parseInt(hrValue, 10);

        // Route the reading to the right session.
        // If needed, auto-link the device to the first available session.
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
            } else {
                for (const [socketId, session] of userSessions.entries()) {
                    if (!session.linkedDevice) {
                        session.linkedDevice = deviceId;
                        targetSessionId = socketId;
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


// HypeRate WebSocket Bridge

const WebSocket = require('ws');

let HYPERATE_SESSION = '5038D';
const HYPERATE_TOKEN   = 'Q5Ag4eAQBL4VJqG33DK3FPyItfEHsmgmVp1z9kk7';
let hrSocket = null; // Keep the current socket so it can be replaced cleanly.

function connectHypeRate(sessionCode) {
    const activeSession = sessionCode || HYPERATE_SESSION;
    const ws = new WebSocket(
        `wss://app.hyperate.io/socket/websocket?token=${HYPERATE_TOKEN}&vsn=2.0.0`
    );

    ws.on('open', () => {
        ws.send(JSON.stringify({
            "topic": `hr:${activeSession}`,
            "event": "phx_join",
            "payload": {},
            "ref": 0
        }));
        // Phoenix requires a heartbeat every 10 seconds.
        const hb = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    "topic": "phoenix", "event": "heartbeat",
                    "payload": {}, "ref": 0
                }));
            } else {
                clearInterval(hb);
            }
        }, 10000);
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.event === 'hr_update') {
                const hr = msg.payload.hr;

                // Forward the reading to the matching session.
                userSessions.forEach((session, socketId) => {
                    if (session.linkedDevice === activeSession || userSessions.size === 1) {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            const sessionContext = {
                                interventionTrigger: 'MONITORING',
                                userPreferences: session.userPreferences,
                                patientAnxietyLevel: 0
                            };
                            const userPalette = session.userPreferences.palette || 'OCEAN';
                            const command = getEbdPrescription(hr, 0, userPalette, sessionContext);
                            safeEmit(socket, command);
                        }
                    }
                });
            }
        } catch (e) {}
    });

    ws.on('error', (err) => {
        console.error('❌ HypeRate error:', err.message);
    });

    ws.on('close', (code) => {
        // Reconnect only if this socket is still the active one.
        if (hrSocket === ws) {
            console.warn(`⚠️ HypeRate closed (code: ${code}). Retrying in 30s...`);
            setTimeout(() => connectHypeRate(activeSession), 30000);
        }
    });

    hrSocket = ws;
}

function switchHypeRateSession(sessionCode) {
    const nextSession = (sessionCode || HYPERATE_SESSION).trim().toUpperCase();
    if (!nextSession) return false;

    if (nextSession === HYPERATE_SESSION && hrSocket && hrSocket.readyState === WebSocket.OPEN) {
        return true;
    }


    if (hrSocket) {
        const old = hrSocket;
        hrSocket = null; // Clear first so the close handler does not reconnect it.
        old.terminate();
    }

    HYPERATE_SESSION = nextSession;
    connectHypeRate(nextSession);
    return true;
}


// Watch Switch Endpoint

app.post('/connect-watch', (req, res) => {
    const sessionCode = (req.body.sessionCode || '').trim().toUpperCase();
    if (!sessionCode) return res.status(400).send('Missing sessionCode');
    switchHypeRateSession(sessionCode);

    res.status(200).json({ connected: true, session: sessionCode });
});

connectHypeRate();


// Start the server.
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
