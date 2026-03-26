// main.js - Therapeutic Environment Setup Bridge
// This script captures user preferences and passes them to the AR experience

// Valid palette options - must match backend colorMapping keys
const VALID_PALETTES = ["AMBER", "VIOLET", "PINK", "EARTH", "OCEAN", "NATURE"];
const DEFAULT_PALETTE = "AMBER";

document.addEventListener("DOMContentLoaded", () => {
  const launchBtn = document.getElementById("launchBtn");

  // Handle launch button click
  launchBtn.addEventListener("click", () => {
    // 1. Correctly find the checked radio buttons (Fixes the ID mismatch)
    const paletteEl = document.querySelector('input[name="palette"]:checked');
    const modeEl = document.querySelector('input[name="mode"]:checked');

    if (!paletteEl || !modeEl) {
      alert("Please select a palette and a focal point.");
      return;
    }

    // 2. Save with the EXACT keys ar.html is looking for
    localStorage.setItem("selectedPalette", paletteEl.value);
    localStorage.setItem("distractionStyle", modeEl.value);

    // Step 3 Toggles - using the IDs from your index.html
    localStorage.setItem(
      "chatbotEnabled",
      document.getElementById("voice-toggle").checked,
    );
    localStorage.setItem(
      "soundEnabled",
      document.getElementById("sound-toggle").checked,
    );
    localStorage.setItem(
      "hapticEnabled",
      document.getElementById("haptic-toggle").checked,
    );

    // Log for debugging (can be removed in production)
    console.log("Therapeutic Setup Complete:", {
      palette: paletteEl.value,
      mode: modeEl.value,
      chatbotEnabled: document.getElementById("voice-toggle").checked,
      soundEnabled: document.getElementById("sound-toggle").checked,
      hapticEnabled: document.getElementById("haptic-toggle").checked,
      timestamp: new Date().toISOString(),
    });

    // 3. Move to the AR experience
    window.location.href = "ar.html";
  });
});
