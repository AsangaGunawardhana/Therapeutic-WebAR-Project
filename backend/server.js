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

const DEBOUNCE_MS = 1200; // wait before reacting
const HOLD_MS = 3000; // stay in one state

let lastState = null;
let lastHR = null;
let lastHRV = null;
let lastTime = 0;
let timer = null;

// Store user's mode preference across all data sources
let userModePreference = { comfortMode: false, fullAR: true };

function safeEmit(command) {
  const now = Date.now();

  // emergency → send immediately
  if (command.state === "BRADYCARDIA_ALERT") {
    io.emit("ar:command", command);
    lastState = command.state;
    lastHR = command.vitals.hr;
    lastHRV = command.vitals.hrv;
    lastTime = now;
    return;
  }

  // same state AND same vitals → do nothing
  if (
    command.state === lastState &&
    command.vitals.hr === lastHR &&
    command.vitals.hrv === lastHRV
  ) {
    return;
  }

  // too soon → wait
  if (now - lastTime < HOLD_MS) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      io.emit("ar:command", command);
      lastState = command.state;
      lastHR = command.vitals.hr;
      lastHRV = command.vitals.hrv;
      lastTime = Date.now();
    }, DEBOUNCE_MS);
    return;
  }

  // normal case
  io.emit("ar:command", command);
  lastState = command.state;
  lastHR = command.vitals.hr;
  lastHRV = command.vitals.hrv;
  lastTime = now;
}

// 5. When a client connects
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("bio:update", ({ hr, hrv, userPalette, sessionContext }) => {
    console.log("🔍 Backend received:", { hr, hrv, userPalette, sessionContext });

    // Use updated ebdEngine with sessionContext for dual-mode system
    const fullSessionContext = sessionContext || {
      interventionTrigger: 'PATIENT_INITIATED',
      userPreferences: { comfortMode: false, fullAR: true },
      patientAnxietyLevel: 5 // Default moderate
    };

    // Remember user's mode preference for future hardware updates
    if (sessionContext && sessionContext.userPreferences) {
      userModePreference = sessionContext.userPreferences;
      console.log("💾 Saved user mode preference:", userModePreference);
    }

    const command = getEbdPrescription(hr, hrv, userPalette, fullSessionContext);

    console.log("📤 Backend sending:", JSON.stringify(command, null, 2));

    safeEmit(command);
  });

  // 6. When client disconnects
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ========================================
// ⌚ HARDWARE BRIDGE: TIZEN WATCH LISTENER
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all('/hr', (req, res) => {
    let hrValue = req.query.hr || req.query.heartrate || req.body.hr || req.body.heartrate;
    if (!hrValue && Object.keys(req.body).length > 0) hrValue = Object.keys(req.body)[0];

    if (hrValue) {
        const liveHR = parseInt(hrValue, 10);
        console.log(`🫀 [WATCH LIVE] Heart Rate: ${liveHR} BPM`);

        // Use updated ebdEngine with user's saved mode preference
        const sessionContext = {
          interventionTrigger: 'MONITORING', // Pure monitoring from hardware
          userPreferences: userModePreference, // Use saved preference!
          patientAnxietyLevel: 0 // No self-reported anxiety from hardware
        };

        const command = getEbdPrescription(liveHR, 60, 'AMBER', sessionContext);
        safeEmit(command);

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
                console.log(`❤️ LIVE HR: ${hr} BPM`);

                // Use updated ebdEngine with user's saved mode preference
                const sessionContext = {
                  interventionTrigger: 'MONITORING', // Pure monitoring from HypeRate
                  userPreferences: userModePreference, // Use saved preference!
                  patientAnxietyLevel: 0 // No self-reported anxiety from hardware
                };

                const command = getEbdPrescription(hr, 60, 'AMBER', sessionContext);
                safeEmit(command);
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


// 8. Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
