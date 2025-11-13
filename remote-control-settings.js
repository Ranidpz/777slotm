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
        shareBtn.addEventListener('click', async () => {
            // בדוק אם sessionManager קיים ומוכן
            if (!window.sessionManager) {
                alert('שגיאה: מערכת השליטה מרחוק לא מוכנה. נא לרענן את הדף.');
                console.error('❌ sessionManager לא קיים');
                return;
            }

            // פונקציה להעתקת הלינק ללוח
            const copyToClipboard = async () => {
                try {
                    if (!window.sessionManager || !sessionManager.sessionId) {
                        console.error('❌ sessionManager או sessionId לא קיים');
                        alert('שגיאה: לא ניתן ליצור לינק. נא לרענן את הדף.');
                        return false;
                    }

                    const controllerUrl = sessionManager.getControllerUrl();
                    console.log(`🔗 לינק שלט רחוק: ${controllerUrl}`);

                    // העתק ללוח
                    await navigator.clipboard.writeText(controllerUrl);

                    // הודעת הצלחה
                    alert('✅ הלינק הועתק ללוח!\n\nהדבק אותו בדפדפן כדי לפתוח את השלט רחוק.');
                    console.log('✅ לינק הועתק בהצלחה');

                    return true;
                } catch (error) {
                    console.error('❌ שגיאה בהעתקת לינק:', error);

                    // אם ההעתקה נכשלה, הצג את הלינק בהודעה
                    const controllerUrl = sessionManager.getControllerUrl();
                    prompt('העתק את הלינק הזה:', controllerUrl);

                    return false;
                }
            };

            // אם אין sessionId עדיין, חכה רגע
            if (!sessionManager.sessionId) {
                console.log('⏳ ממתין ל-sessionId...');

                // נסה כמה פעמים עם timeout
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    console.log(`🔄 נסיון ${attempts}/20...`);

                    if (window.sessionManager && sessionManager.sessionId) {
                        clearInterval(checkInterval);
                        console.log('✅ sessionId נמצא!');
                        copyToClipboard();
                    } else if (attempts >= 20) { // 10 שניות (20 * 500ms)
                        clearInterval(checkInterval);
                        alert('שגיאה: לא ניתן ליצור לינק. נא לרענן את הדף.');
                        console.error('❌ Timeout: sessionId לא נוצר אחרי 10 שניות');
                    }
                }, 500);
            } else {
                // sessionId כבר קיים, העתק ישירות
                console.log('✅ sessionId כבר קיים');
                copyToClipboard();
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
