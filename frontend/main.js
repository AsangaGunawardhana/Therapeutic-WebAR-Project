// Setup bridge for the AR session.


//  palette names need to stay in sync with the backend mapping.
const VALID_PALETTES = ["AMBER", "VIOLET", "PINK", "EARTH", "OCEAN", "NATURE"];
const DEFAULT_PALETTE = "AMBER";

document.addEventListener("DOMContentLoaded", () => {
  const launchBtn = document.getElementById("launchBtn");

  // Save the selected options, then open the AR screen.
  launchBtn.addEventListener("click", () => {
    // Read the selected palette and mode.
    const paletteEl = document.querySelector('input[name="palette"]:checked');
    const modeEl = document.querySelector('input[name="mode"]:checked');

    if (!paletteEl || !modeEl) {
      alert("Please select a palette and a focal point.");
      return;
    }

    // Store them with the keys used by ar.html.
    localStorage.setItem("selectedPalette", paletteEl.value);
    localStorage.setItem("distractionStyle", modeEl.value);

    // Save the optional toggles too.
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

    // Helpful while checking setup flow locally.

    // Continue to the session.
    window.location.href = "ar.html";
  });
});
