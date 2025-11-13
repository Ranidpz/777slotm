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
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Only run on main page (not controller)
    if (!window.location.pathname.includes('controller.html')) {
        setupRemoteControlCheckbox();
        updateRemoteControlState();
    }
});
