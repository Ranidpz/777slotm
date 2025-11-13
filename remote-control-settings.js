// Remote Control Settings Helper
// Handles remote control enable/disable with checkbox

function updateRemoteControlState() {
    const qrContainer = document.getElementById('qr-container');
    const qrDisplay = document.getElementById('qr-display');
    const isEnabled = localStorage.getItem('remoteControlEnabled') !== 'false';

    // הסתר או הצג את ה-QR
    if (qrContainer) {
        qrContainer.style.display = isEnabled ? 'block' : 'none';
    }

    if (qrDisplay) {
        qrDisplay.style.display = isEnabled ? 'block' : 'none';
    }

    console.log(`🎮 שליטה מרחוק: ${isEnabled ? 'מופעל' : 'כבוי'}`);

    // אם כובה - נקה את ה-session manager
    if (!isEnabled && window.sessionManager) {
        sessionManager.destroy();
    }

    // אם הופעל - אתחל מחדש
    if (isEnabled && window.sessionManager) {
        sessionManager.init();
    }
}

function setupRemoteControlCheckbox() {
    const checkbox = document.getElementById('remote-control-enabled');
    const attemptsSlider = document.getElementById('max-player-attempts');
    const attemptsValue = document.getElementById('max-attempts-value');
    const shareBtn = document.getElementById('share-controller-link-btn');

    if (checkbox) {
        // טען מצב שמור או ברירת מחדל (מופעל)
        const savedState = localStorage.getItem('remoteControlEnabled');
        checkbox.checked = savedState !== 'false';

        console.log(`🎮 שליטה מרחוק נטעןה: ${checkbox.checked ? 'מופעל' : 'כבוי'}`);

        // עדכן כשמשנים
        checkbox.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            localStorage.setItem('remoteControlEnabled', isEnabled);
            console.log(`🎮 שליטה מרחוק עודכנה: ${isEnabled ? 'מופעל' : 'כבוי'}`);

            // עדכן מצב השליטה מרחוק
            updateRemoteControlState();
        });
    }

    // טיפול בסליידר מספר נסיונות
    if (attemptsSlider && attemptsValue) {
        const savedAttempts = localStorage.getItem('maxPlayerAttempts') || '3';
        attemptsSlider.value = savedAttempts;
        attemptsValue.textContent = savedAttempts;

        attemptsSlider.addEventListener('input', (e) => {
            const attempts = e.target.value;
            attemptsValue.textContent = attempts;
            localStorage.setItem('maxPlayerAttempts', attempts);
            console.log(`🎮 מספר נסיונות עודכן: ${attempts}`);
        });
    }

    // כפתור שיתוף לינק לשלט רחוק
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (window.sessionManager && sessionManager.sessionId) {
                const controllerUrl = sessionManager.getControllerUrl();
                console.log(`🔗 פותח שלט רחוק: ${controllerUrl}`);
                window.open(controllerUrl, '_blank');
            } else {
                alert('לא ניתן לפתוח שלט רחוק - אין סשן פעיל');
                console.error('❌ אין sessionManager או sessionId');
            }
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Only run on main page (not controller)
    if (!window.location.pathname.includes('controller.html')) {
        setupRemoteControlCheckbox();
        updateRemoteControlState();
    }
});
