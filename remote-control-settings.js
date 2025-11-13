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
            // בדוק אם sessionManager קיים ומוכן
            if (!window.sessionManager) {
                alert('שגיאה: מערכת השליטה מרחוק לא מוכנה. נא לרענן את הדף.');
                console.error('❌ sessionManager לא קיים');
                return;
            }

            // אם אין sessionId עדיין, חכה רגע
            if (!sessionManager.sessionId) {
                console.log('⏳ ממתין ל-sessionId...');

                // נסה כמה פעמים עם timeout
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;

                    if (sessionManager.sessionId) {
                        clearInterval(checkInterval);
                        openControllerWindow();
                    } else if (attempts >= 20) { // 10 שניות (20 * 500ms)
                        clearInterval(checkInterval);
                        alert('שגיאה: לא ניתן לפתוח שלט רחוק. נא לרענן את הדף.');
                        console.error('❌ Timeout: sessionId לא נוצר');
                    }
                }, 500);
            } else {
                // sessionId כבר קיים, פתח ישירות
                openControllerWindow();
            }
        });
    }

    // פונקציה לפתיחת חלון השלט רחוק
    function openControllerWindow() {
        try {
            const controllerUrl = sessionManager.getControllerUrl();
            console.log(`🔗 פותח שלט רחוק: ${controllerUrl}`);

            // פתח בחלון קטן שנראה כמו מסך טלפון
            const windowFeatures = 'height=700,width=380,left=100,top=100,resizable=yes,scrollbars=yes';
            const newWindow = window.open(controllerUrl, 'RemoteController', windowFeatures);

            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                alert('לא ניתן לפתוח חלון חדש. אנא אפשר חלונות קופצים (pop-ups) בדפדפן.');
            }
        } catch (error) {
            console.error('❌ שגיאה בפתיחת שלט רחוק:', error);
            alert('שגיאה בפתיחת שלט רחוק. נא לבדוק את הקונסול.');
        }
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
