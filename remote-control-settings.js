// Remote Control Settings Helper
// Handles remote control enable/disable based on max attempts value

function updateRemoteControlState() {
    const qrContainer = document.getElementById('qr-container');
    const qrDisplay = document.getElementById('qr-display');
    const maxAttempts = parseInt(localStorage.getItem('maxPlayerAttempts')) || 3;

    // אם maxAttempts = 0, כבה שליטה מרחוק
    const isEnabled = maxAttempts > 0;

    // הסתר את כל ה-container וגם את ה-QR display עצמו
    if (qrContainer) {
        qrContainer.style.display = isEnabled ? 'block' : 'none';
    }

    if (qrDisplay) {
        qrDisplay.style.display = isEnabled ? 'block' : 'none';
    }

    console.log(`🎮 שליטה מרחוק: ${isEnabled ? 'מופעל' : 'כבוי'} (נסיונות: ${maxAttempts})`);

    // אם כובה - נקה את ה-session manager
    if (!isEnabled && window.sessionManager) {
        sessionManager.destroy();
    }

    // אם הופעל - אתחל מחדש
    if (isEnabled && window.sessionManager) {
        sessionManager.init();
    }
}

function setupMaxAttemptsControl() {
    const attemptsSlider = document.getElementById('max-player-attempts');
    const attemptsValue = document.getElementById('max-attempts-value');

    if (attemptsSlider && attemptsValue) {
        // טען ערך שמור או ברירת מחדל
        const savedValue = localStorage.getItem('maxPlayerAttempts') || '3';
        attemptsSlider.value = savedValue;
        attemptsValue.textContent = savedValue;

        console.log(`🎮 מספר נסיונות לשחקן נטען: ${savedValue}`);

        // עדכן בזמן אמת
        attemptsSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            attemptsValue.textContent = value;
            localStorage.setItem('maxPlayerAttempts', value);
            console.log(`🎮 מספר נסיונות לשחקן עודכן: ${value}`);

            // עדכן מצב השליטה מרחוק
            updateRemoteControlState();
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Only run on main page (not controller)
    if (!window.location.pathname.includes('controller.html')) {
        setupMaxAttemptsControl();
        updateRemoteControlState();
    }
});
