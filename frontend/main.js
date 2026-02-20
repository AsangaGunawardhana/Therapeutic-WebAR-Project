// main.js - Therapeutic Environment Setup Bridge
// This script captures user preferences and passes them to the AR experience

// Valid palette options - must match backend colorMapping keys
const VALID_PALETTES = ['AMBER', 'VIOLET', 'PINK', 'EARTH'];
const DEFAULT_PALETTE = 'AMBER';

document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launchBtn');
    const paletteSelect = document.getElementById('userPalette');
    const chatbotToggle = document.getElementById('chatbotToggle');

    // Load previously saved preferences (if any)
    const savedPalette = localStorage.getItem('selectedPalette');
    const savedChatbot = localStorage.getItem('chatbotActive');

    // Validate saved palette before using it
    if (savedPalette && VALID_PALETTES.includes(savedPalette)) {
        paletteSelect.value = savedPalette;
    } else if (savedPalette) {
        // Invalid palette found, clear it and use default
        console.warn(`Invalid palette "${savedPalette}" found in localStorage. Using default.`);
        localStorage.setItem('selectedPalette', DEFAULT_PALETTE);
    }

    if (savedChatbot !== null) {
        chatbotToggle.checked = savedChatbot === 'true';
    }

    // Handle launch button click
    launchBtn.addEventListener('click', () => {
        const palette = paletteSelect.value;
        const chatbot = chatbotToggle.checked;

        // Client-side validation: ensure palette is valid before saving
        if (!VALID_PALETTES.includes(palette)) {
            console.error(`Invalid palette selection: "${palette}". Using default.`);
            localStorage.setItem('selectedPalette', DEFAULT_PALETTE);
            alert('Invalid color palette selected. Using default Amber palette.');
            return; // Prevent navigation with invalid data
        }

        // Save validated preferences to localStorage
        localStorage.setItem('selectedPalette', palette);
        localStorage.setItem('chatbotActive', chatbot);

        // Log for debugging (can be removed in production)
        console.log('Therapeutic Setup Complete:', {
            palette,
            chatbot,
            timestamp: new Date().toISOString()
        });

        // Navigate to the AR scene
        window.location.href = 'ar.html';
    });

    // Optional: Add visual feedback on selection change
    paletteSelect.addEventListener('change', () => {
        paletteSelect.style.borderColor = '#3b82f6';
        setTimeout(() => {
            paletteSelect.style.borderColor = '#e2e8f0';
        }, 300);
    });

    chatbotToggle.addEventListener('change', () => {
        const toggleGroup = chatbotToggle.closest('.toggle-group');
        toggleGroup.style.borderColor = '#3b82f6';
        setTimeout(() => {
            toggleGroup.style.borderColor = '#e2e8f0';
        }, 300);
    });
});
