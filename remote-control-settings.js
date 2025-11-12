// Remote Control Settings Helper
// Handles remote control enable/disable and max attempts

function setupRemoteControlToggle() {
    const remoteControlCheckbox = document.getElementById('remote-control-enabled');
    const qrContainer = document.getElementById('qr-container');

    if (remoteControlCheckbox) {
        // טען הגדרה שמורה
        const savedEnabled = localStorage.getItem('remoteControlEnabled');
        const isEnabled = savedEnabled === null ? true : savedEnabled === 'true';

        remoteControlCheckbox.checked = isEnabled;

        // הצג או הסתר את ה-QR container
        if (qrContainer) {
            qrContainer.style.display = isEnabled ? 'block' : 'none';
        }

        console.log(`🎮 שליטה מרחוק: ${isEnabled ? 'מופעל' : 'כבוי'}`);

        // מאזין לשינויים
        remoteControlCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('remoteControlEnabled', enabled);

            // הצג או הסתר את ה-QR container
            if (qrContainer) {
                qrContainer.style.display = enabled ? 'block' : 'none';
            }

            console.log(`🎮 שליטה מרחוק ${enabled ? 'הופעל' : 'כובה'}`);

            // אם כובה - נקה את ה-session manager
            if (!enabled && window.sessionManager) {
                sessionManager.destroy();
            }

            // אם הופעל - אתחל מחדש
            if (enabled && window.sessionManager) {
                sessionManager.init();
            }
        });
    }
}

function setupMaxAttemptsControl() {
    const attemptsSlider = document.getElementById('max-player-attempts');
    const attemptsValue = document.getElementById('max-attempts-value');
    const attemptsText = document.getElementById('max-attempts-text');

    if (attemptsSlider && attemptsValue && attemptsText) {
        // טען ערך שמור או ברירת מחדל
        const savedValue = localStorage.getItem('maxPlayerAttempts') || '3';
        attemptsSlider.value = savedValue;
        attemptsValue.textContent = savedValue;
        attemptsText.textContent = savedValue;

        console.log(`🎮 מספר נסיונות לשחקן נטען: ${savedValue}`);

        // עדכן בזמן אמת
        attemptsSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            attemptsValue.textContent = value;
            attemptsText.textContent = value;
            localStorage.setItem('maxPlayerAttempts', value);
            console.log(`🎮 מספר נסיונות לשחקן עודכן: ${value}`);
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Only run on main page (not controller)
    if (!window.location.pathname.includes('controller.html')) {
        setupRemoteControlToggle();
        setupMaxAttemptsControl();
    }
});
