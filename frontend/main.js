// main.js - Therapeutic Environment Setup Bridge
// This script captures user preferences and passes them to the AR experience

document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launchBtn');
    const paletteSelect = document.getElementById('userPalette');
    const chatbotToggle = document.getElementById('chatbotToggle');

    // Load previously saved preferences (if any)
    const savedPalette = localStorage.getItem('selectedPalette');
    const savedChatbot = localStorage.getItem('chatbotActive');

    if (savedPalette) {
        paletteSelect.value = savedPalette;
    }

    if (savedChatbot !== null) {
        chatbotToggle.checked = savedChatbot === 'true';
    }

    // Handle launch button click
    launchBtn.addEventListener('click', () => {
        const palette = paletteSelect.value;
        const chatbot = chatbotToggle.checked;

        // Save preferences to localStorage
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
