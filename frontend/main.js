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
        // 1. Get the selections
        const selectedColor = document.getElementById('userPalette').value;
        const selectedStyle = document.getElementById('distraction-style-select').value;
        const isChatbotEnabled = document.getElementById('chatbotToggle').checked;

        // 2. Save to LocalStorage
        localStorage.setItem('selectedPalette', selectedColor);
        localStorage.setItem('distractionStyle', selectedStyle);
        localStorage.setItem('chatbotEnabled', isChatbotEnabled);

        // Log for debugging (can be removed in production)
        console.log('Therapeutic Setup Complete:', {
            selectedColor,
            selectedStyle,
            isChatbotEnabled,
            timestamp: new Date().toISOString()
        });

        // 3. Launch the AR Room
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
