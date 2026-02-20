# Therapeutic WebAR Project

A real-time WebAR therapeutic application that uses biometric data (Heart Rate and Heart Rate Variability) to provide adaptive AR visualizations and coaching guidance through an evidence-based decision engine.

## 📦 For Quick Start from ZIP File

**If you received this project as a ZIP file from Google Drive or similar:**

### Step 1: Extract the ZIP File

1. Locate the downloaded ZIP file (e.g., `Therapeutic-WebAR-Project.zip`)
2. Right-click the ZIP file and select "Extract All..." (Windows) or double-click (Mac)
3. Choose a destination folder (e.g., `Desktop` or `Documents`)
4. Wait for extraction to complete

### Step 2: Verify Extraction

Navigate to the extracted folder and ensure you see:

```
Therapeutic-WebAR-Project/
├── backend/
├── frontend/
├── docs/
├── README.md
└── TASKS.md
```

### Step 3: Continue with Setup

Once extracted, follow the complete **Step-by-Step Setup Guide** below to:

1. Install Node.js dependencies
2. Start the backend server
3. Connect your mobile device
4. Run the AR application

**⏱️ Estimated Setup Time**: 5-10 minutes (assuming Node.js is already installed)

---

## 🌟 Project Overview

This application creates an immersive AR experience on mobile devices that responds to user's vital signs in real-time. The system monitors heart rate (HR) and heart rate variability (HRV) to provide personalized therapeutic interventions through visual AR elements and coaching messages.

### Key Features

- **Real-time Biometric Monitoring**: Continuous tracking of HR and HRV
- **Evidence-Based Decision Engine**: Adaptive therapy based on physiological states
- **WebAR Visualization**: 3D therapeutic orb with dynamic animations
- **Mobile Camera Integration**: Live camera feed for AR experience
- **Socket.IO Communication**: Low-latency client-server connection
- **Responsive Medical HUD**: Professional dashboard with vitals display

## ⚠️ Current Limitations

**IMPORTANT**: While multiple devices can technically connect to the server, the application is **designed for SINGLE-USER sessions only**.

**Why?** The server uses shared state management, meaning:

- All connected devices receive the SAME AR commands (broadcast to everyone)
- When any device sends biometric data, it affects what ALL devices see
- No per-client session management or individual state tracking
- If Device A has HR=60 and Device B has HR=120, both will see AR responses based on whichever device sent data most recently

**Result**: Multiple simultaneous connections will cause state conflicts, visual inconsistencies, and unpredictable therapeutic responses. **Use one mobile device at a time for intended functionality.**

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A modern mobile device** with:
  - Rear camera
  - Modern browser (Chrome, Safari, or Firefox)
  - Support for WebRTC (for camera access)
- **WiFi network** (both computer and mobile device must be on the same network)

## 🚀 Step-by-Step Setup Guide

### Step 1: Download/Clone the Project

1. Download the project or clone it to your computer
2. Navigate to the project directory:
   ```bash
   cd Therapeutic-WebAR-Project
   ```

### Step 2: Install Backend Dependencies

1. Open a terminal/command prompt
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```
3. Install required packages:
   ```bash
   npm install
   ```
   This will install:
   - `express` - Web server framework
   - `socket.io` - Real-time communication
   - `nodemon` - Development tool (optional)

### Step 3: Find Your Computer's IP Address

You need your computer's local IP address so your mobile device can connect to it.

**On Windows:**

1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.0.105`)

**On Mac/Linux:**

1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your local IP address (e.g., `192.168.0.105`)

### Step 4: Start the Backend Server

1. Make sure you're in the `backend` directory
2. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npx nodemon server.js
   ```
3. You should see:
   ```
   Server running at http://localhost:3000
   ```

### Step 5: Access from Your Mobile Device

1. **Ensure your mobile device is on the same WiFi network as your computer**
2. Open a browser on your mobile device (Chrome recommended)
3. Choose one of the following options:

   **Option A: Testing on the Same Computer (Localhost)**
   ```
   http://localhost:3000/ar.html
   ```

   **Option B: Testing on Mobile Device (Requires HTTPS)**
   
   ⚠️ **Important:** Modern browsers require **HTTPS or localhost** for camera access. Plain HTTP via IP address (e.g., `http://192.168.0.105:3000/ar.html`) will **NOT work** for camera access.

   **Solution - Use ngrok for HTTPS:**
   
   1. Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)
   2. In a new terminal, run:
      ```bash
      ngrok http 3000
      ```
   3. Copy the HTTPS URL provided (e.g., `https://abc123.ngrok.app`)
   4. On your mobile device, open:
      ```
      https://YOUR_NGROK_URL.ngrok.app/ar.html
      ```

### Step 6: Grant Camera Permissions

1. When prompted, **allow camera access** on your device
2. The browser will request permission to use your rear camera
3. Click/tap "Allow" or "Accept"

### Step 7: Using the Application

Once the AR interface loads:

1. **Camera Feed**: You should see your rear camera feed in the background
2. **AR Orb**: A 3D orb will appear in the center of your screen
3. **Medical HUD**: Vitals panel at the bottom showing HR and HRV
4. **Coaching Text**: Guidance messages at the top

#### Simulating Biometric Data

Currently, the application uses simulated data. The orb and coaching will change based on:

- **Normal State** (HR: 60-100, HRV: 30-100ms)
  - Blue pulsing orb
  - Calm coaching messages
- **Stress State** (HR: 100-140, HRV: 10-30ms)
  - Yellow/Orange orb with faster pulsing
  - Stress reduction coaching
- **Emergency State** (HR: <40 or >140)
  - Red alert orb
  - Emergency instructions

## 📁 Project Structure

```
Therapeutic-WebAR-Project/
│
├── backend/
│   ├── server.js           # Express + Socket.IO server
│   ├── ebdEngine.js        # Evidence-based decision engine
│   └── package.json        # Node dependencies
│
├── frontend/
│   ├── ar.html            # Main AR interface (mobile)
│   ├── index.html         # Latency test page
│   ├── dashboard.html     # Desktop monitoring dashboard
│   └── test-transitions.html  # State transition testing
│
├── docs/
│   └── qa/                # Quality assurance reports
│
└── README.md              # This file
```

## 🔧 Configuration

### Server Settings

Edit `backend/server.js` to adjust:

- **PORT**: Default is `3000`
- **DEBOUNCE_MS**: Delay before reacting to state changes (default: 1200ms)
- **HOLD_MS**: Minimum time to stay in one state (default: 7000ms)

### AR Visual Settings

Edit `frontend/ar.html` to customize:

- Orb size, colors, and animations
- HUD layout and styling
- Coaching message content

## 🧪 Testing

### Test Real-time Connection

1. Access: `http://YOUR_IP_ADDRESS:3000/index.html` on any device
2. Check the latency measurements
3. Latency should be under 2 seconds for optimal performance

### Test State Transitions

1. Access: `http://YOUR_IP_ADDRESS:3000/test-transitions.html`
2. Use the control panel to simulate different biometric states
3. Observe orb color changes and coaching updates

## 🐛 Troubleshooting

### Problem: Cannot Connect from Mobile Device

**Solutions:**

- Verify both devices are on the same WiFi network
- Check firewall settings (allow port 3000)
- Try disabling VPN on either device
- Ensure you're using `http://` not `https://`
- Try restarting the server

### Problem: Camera Not Working

**Solutions:**

- Use HTTPS for secure camera access (requires SSL certificate)
- Try a different browser (Chrome works best)
- Check browser camera permissions in settings
- Ensure no other app is using the camera

### Problem: Connection Keeps Dropping

**Solutions:**

- Check WiFi signal strength
- Reduce distance between devices and router
- Close other bandwidth-heavy applications
- Check for browser console errors (Developer Tools)

### Problem: Orb Not Responding

**Solutions:**

- Check browser console for JavaScript errors
- Verify Socket.IO connection status
- Restart the server and refresh the page
- Clear browser cache

## 🔒 Security Notes

- This is a development/research application
- Do NOT expose to public internet without proper security measures
- Camera feed is NOT recorded or transmitted
- All data processing happens in real-time, nothing is stored

## 📱 Supported Devices

### Tested Browsers:

- ✅ Chrome (Android/iOS)
- ✅ Safari (iOS)
- ⚠️ Firefox (Mobile) - limited WebRTC support

### Recommended:

- Android 8.0+ with Chrome
- iOS 12+ with Safari
- Minimum 2GB RAM
- Stable WiFi connection

## 🔮 Future Enhancements

- [ ] Multi-device support with session management
- [ ] Real biometric sensor integration (wearables)
- [ ] Cloud deployment
- [ ] User authentication and profiles
- [ ] Data persistence and analytics
- [ ] Advanced AR markers and object tracking

## 📞 Support

For issues or questions related to this project:

1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify all setup steps were completed correctly

## 📄 License

This is a Final Year Project (FYP) for educational and research purposes.

## 👥 Contributors

Final Year Project - Therapeutic WebAR Implementation

---

**Last Updated**: February 5, 2026  
**Version**: 1.0.0  
**Status**: Development/Research Phase
