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

// 4. Serve static files from this folder (so index.html can be loaded)
app.use(express.static(path.join(__dirname, "../frontend")));

const DEBOUNCE_MS = 1200; // wait before reacting
const HOLD_MS = 7000; // stay in one state

let lastState = null;
let lastHR = null;
let lastHRV = null;
let lastTime = 0;
let timer = null;

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

  socket.on("bio:update", ({ hr, hrv }) => {
    const command = getEbdPrescription(hr, hrv); // already locked schema
    safeEmit(command);
  });

  // 6. When client disconnects
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// 8. Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
