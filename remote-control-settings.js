// Remote Control Settings Helper
// Handles remote control enable/disable with checkbox

function updateRemoteControlState() {
    const qrContainer = document.getElementById('qr-container');
    const qrDisplay = document.getElementById('qr-display');
    const isEnabled = localStorage.getItem('remoteControlEnabled') === 'true';

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
        // טען מצב שמור או ברירת מחדל (כבוי)
        const savedState = localStorage.getItem('remoteControlEnabled');
        checkbox.checked = savedState === 'true';

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
        // השבת את הכפתור בהתחלה
        shareBtn.disabled = true;
        shareBtn.style.opacity = '0.5';
        shareBtn.style.cursor = 'not-allowed';
        shareBtn.title = 'מחכה לאתחול...';

        // המתן ל-sessionId להיות מוכן
        const waitForSession = setInterval(() => {
            if (window.sessionManager && sessionManager.sessionId) {
                clearInterval(waitForSession);
                // אפשר את הכפתור
                shareBtn.disabled = false;
                shareBtn.style.opacity = '1';
                shareBtn.style.cursor = 'pointer';
                shareBtn.title = 'פתח שלט רחוק';
                console.log('✅ כפתור שיתוף מוכן');
            }
        }, 100);

        // timeout אחרי 10 שניות
        setTimeout(() => {
            if (shareBtn.disabled) {
                clearInterval(waitForSession);
                shareBtn.title = 'שגיאה - רענן את הדף';
                console.error('❌ Timeout: sessionId לא נוצר');
            }
        }, 10000);

        shareBtn.addEventListener('click', async () => {
            if (!window.sessionManager || !sessionManager.sessionId) {
                alert('שגיאה: מערכת השליטה מרחוק לא מוכנה. נא לרענן את הדף.');
                return;
            }

            try {
                const controllerUrl = sessionManager.getControllerUrl();
                console.log(`🔗 לינק שלט רחוק: ${controllerUrl}`);

                // העתק ללוח
                await navigator.clipboard.writeText(controllerUrl);

                // הודעת הצלחה
                alert('✅ הלינק הועתק ללוח!\n\nהדבק אותו בדפדפן כדי לפתוח את השלט רחוק.');
                console.log('✅ לינק הועתק בהצלחה');
            } catch (error) {
                console.error('❌ שגיאה בהעתקת לינק:', error);

                // אם ההעתקה נכשלה, הצג את הלינק בהודעה
                try {
                    const controllerUrl = sessionManager.getControllerUrl();
                    prompt('העתק את הלינק הזה:', controllerUrl);
                } catch (err) {
                    alert('שגיאה: לא ניתן ליצור לינק. נא לרענן את הדף.');
                }
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
