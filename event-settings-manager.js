// Event Settings Manager
// ניהול שמירת הגדרות ועדכון אירועים ב-Firebase

const eventSettingsManager = {
    currentEventId: null,

    // אתחול - טען eventId אם קיים ובדוק בעלות
    async init() {
        // נסה לטעון מ-URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const eventIdFromUrl = urlParams.get('event');

        if (eventIdFromUrl) {
            // ✅ יש eventId ב-URL - בדוק בעלות!
            const isOwner = await this.checkOwnership(eventIdFromUrl);

            if (isOwner) {
                // ✅ המשתמש הוא הבעלים - טען את האירוע
                this.currentEventId = eventIdFromUrl;
                localStorage.setItem('currentEventId', eventIdFromUrl);
                console.log('✅ אירוע נטען - המשתמש הוא הבעלים:', eventIdFromUrl);
            } else {
                // ❌ המשתמש לא הבעלים - נקה URL והעבר לדשבורד
                console.warn('⚠️ אין הרשאה לאירוע זה');
                window.history.replaceState({}, '', window.location.pathname);

                if (userAuthManager.isLoggedIn()) {
                    alert('⚠️ אין לך הרשאה לצפות באירוע זה.\n\nמעביר אותך לדשבורד שלך...');
                    window.location.href = 'dashboard.html';
                } else {
                    alert('⚠️ אירוע זה דורש התחברות.\n\nאנא התחבר כדי לגשת לאירוע.');
                }
                return;
            }
        } else {
            // ❌ אין eventId ב-URL - נקה localStorage והצג משחק ברירת מחדל (תבנית)
            this.currentEventId = null;
            localStorage.removeItem('currentEventId');

            // נקה את כל ההגדרות מ-localStorage - יחזור לברירת מחדל
            this.clearAllSettings();

            console.log('🎮 מצב תבנית - משחק ברירת מחדל ללא אירוע');
        }

        console.log('🎯 Event Settings Manager initialized. Current Event ID:', this.currentEventId || 'None (Template Mode)');
    },

    // בדוק אם המשתמש הנוכחי הוא הבעלים של האירוע
    async checkOwnership(eventId) {
        try {
            // ✅ טען נתוני אירוע מ-Firebase
            const eventSnapshot = await firebase.database().ref(`events/${eventId}`).once('value');

            if (!eventSnapshot.exists()) {
                console.warn('⚠️ האירוע לא קיים:', eventId);
                return false;
            }

            const eventData = eventSnapshot.val();
            const eventOwnerId = eventData.ownerId;

            // ✅ בדוק אם המשתמש מחובר
            if (!userAuthManager.isLoggedIn()) {
                console.log('⚠️ משתמש לא מחובר - לא יכול לגשת לאירוע');
                return false;
            }

            const currentUserId = userAuthManager.getUserId();

            // ✅ בדוק אם המשתמש הנוכחי הוא הבעלים
            if (currentUserId === eventOwnerId) {
                console.log('✅ משתמש הוא בעלים של האירוע');
                return true;
            } else {
                console.warn('⚠️ משתמש אינו בעלים של האירוע');
                return false;
            }
        } catch (error) {
            console.error('❌ שגיאה בבדיקת בעלות:', error);
            return false;
        }
    },

    // בדוק אם יש אירוע מקושר
    hasEvent() {
        return this.currentEventId !== null;
    },

    // נקה את כל ההגדרות מ-localStorage - לחזרה לברירות מחדל
    clearAllSettings() {
        // רשימת כל ההגדרות שיש לנקות
        const settingsKeys = [
            'winFrequency',
            'randomBonusPercent',
            'gameMode',
            'whatsappNumber',
            'simpleWinScreen',
            'qrCustomText',
            'simpleWinText',
            'backgroundColor',
            'scrollingBannerText',
            'scrollingBannerFontSize',
            'soundEnabled',
            'customSpin',
            'customWin',
            'customLose',
            'sessionId',
            'mobileWarningDismissed'
        ];

        // נקה כל הגדרה
        settingsKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        // נקה תמונות מותאמות (customSymbol_0 עד customSymbol_8)
        for (let i = 0; i < 9; i++) {
            localStorage.removeItem(`customSymbol_${i}`);
            localStorage.removeItem(`prize_inventory_${i}`);
        }

        console.log('🧹 כל ההגדרות נוקו מ-localStorage - יחזור לברירות מחדל');
    },

    // עדכון תצוגת שם האירוע בפוטר
    async updateEventNameDisplay() {
        const eventNameDisplay = document.getElementById('event-name-display');
        if (!eventNameDisplay) return;

        if (!this.currentEventId) {
            eventNameDisplay.style.display = 'none';
            return;
        }

        try {
            const eventSnapshot = await firebase.database().ref(`events/${this.currentEventId}`).once('value');

            if (eventSnapshot.exists()) {
                const eventData = eventSnapshot.val();
                const eventName = eventData.name || 'אירוע ללא שם';

                eventNameDisplay.textContent = eventName;
                eventNameDisplay.style.display = 'flex';
                console.log('🎪 שם אירוע נטען:', eventName);
            } else {
                eventNameDisplay.style.display = 'none';
            }
        } catch (error) {
            console.warn('⚠️ לא ניתן לטעון שם אירוע:', error);
            eventNameDisplay.style.display = 'none';
        }
    },

    // שמור הגדרות (דורש התחברות!)
    async saveSettings() {
        console.log('💾 מתחיל שמירת הגדרות...');

        // ✅ בדיקה 1: האם המשתמש מחובר?
        if (!userAuthManager.isLoggedIn()) {
            console.log('⚠️ משתמש לא מחובר - מפנה להתחברות');

            // הצג חלון התחברות עם callback לשמירה אחרי התחברות
            userAuthManager.showLoginModal(async () => {
                // אחרי התחברות - נסה שוב לשמור
                await this.saveSettings();
            });
            return false;
        }

        // ✅ המשתמש מחובר
        const userId = userAuthManager.getUserId();

        // ✅ בדיקה 2: האם יש אירוע ב-URL?
        if (this.hasEvent()) {
            // יש אירוע - בדוק בעלות
            const isOwner = await this.checkOwnership(this.currentEventId);

            if (!isOwner) {
                // לא בעלים - הצג מודל "אין הרשאה"
                this.showNoPermissionModal();
                return false;
            }

            // בעלים - עדכן את האירוע
            try {
                await this.saveToLocalStorage();
                await this.saveToFirebaseSession();
                await this.updateEvent(userId);
                console.log('✅ אירוע עודכן בהצלחה!');
                return true;
            } catch (error) {
                console.error('❌ שגיאה בעדכון אירוע:', error);
                alert('❌ שגיאה בשמירת הגדרות. נסה שוב.');
                return false;
            }
        } else {
            // אין אירוע - הצג מודל יצירת אירוע חדש
            this.showCreateEventModal(userId);
            return false; // השמירה תמשיך אחרי יצירת האירוע
        }
    },

    // הצג מודל יצירת אירוע חדש
    showCreateEventModal(userId) {
        // בדוק אם כבר יש מודל פתוח
        if (document.getElementById('create-event-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'create-event-modal';
        modal.className = 'auth-modal show';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>יצירת אירוע חדש</h2>
                    <p>הזן שם לאירוע כדי לשמור את ההגדרות</p>
                </div>

                <div class="auth-modal-body">
                    <input type="text" id="new-event-name"
                           placeholder="שם האירוע (לדוגמה: חתונה של דני ומיכל)"
                           style="width: 100%; padding: 15px; border-radius: 10px; border: 2px solid rgba(255, 215, 0, 0.3); background: rgba(255, 255, 255, 0.1); color: white; font-size: 1.1em; text-align: center; margin-bottom: 20px;">

                    <button class="google-signin-btn" id="create-event-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <span>צור אירוע ועבור לדשבורד</span>
                    </button>
                </div>

                <div class="auth-modal-footer">
                    <button class="cancel-btn" id="cancel-create-event-btn">ביטול</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // הוסף event listeners
        setTimeout(() => {
            const createBtn = document.getElementById('create-event-btn');
            const cancelBtn = document.getElementById('cancel-create-event-btn');
            const nameInput = document.getElementById('new-event-name');
            const overlay = modal.querySelector('.auth-modal-overlay');

            if (createBtn) {
                createBtn.onclick = async () => {
                    const eventName = nameInput.value.trim() || `אירוע ב-${new Date().toLocaleDateString('he-IL')}`;
                    modal.remove();
                    await this.createNewEventWithName(userId, eventName);
                };
            }

            if (cancelBtn) {
                cancelBtn.onclick = () => modal.remove();
            }

            if (overlay) {
                overlay.onclick = () => modal.remove();
            }

            // פוקוס על שדה השם
            if (nameInput) {
                nameInput.focus();
                nameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        createBtn.click();
                    }
                });
            }
        }, 50);
    },

    // הצג מודל "אין הרשאה לעריכה"
    showNoPermissionModal() {
        const modal = document.createElement('div');
        modal.id = 'no-permission-modal';
        modal.className = 'auth-modal show';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2 style="color: #ff6b6b;">אין הרשאה</h2>
                    <p>אתה לא הבעלים של אירוע זה ולא יכול לערוך אותו</p>
                </div>

                <div class="auth-modal-body">
                    <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
                        כדי לערוך אירוע, עליך להיות הבעלים שלו או לבקש הרשאה ממנהל האירוע.
                    </p>

                    <button class="google-signin-btn" id="go-to-dashboard-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <span>עבור לדשבורד שלי</span>
                    </button>
                </div>

                <div class="auth-modal-footer">
                    <button class="cancel-btn" id="close-no-permission-btn">סגור</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            const dashboardBtn = document.getElementById('go-to-dashboard-btn');
            const closeBtn = document.getElementById('close-no-permission-btn');
            const overlay = modal.querySelector('.auth-modal-overlay');

            if (dashboardBtn) {
                dashboardBtn.onclick = () => {
                    window.location.href = 'dashboard.html';
                };
            }

            if (closeBtn) {
                closeBtn.onclick = () => modal.remove();
            }

            if (overlay) {
                overlay.onclick = () => modal.remove();
            }
        }, 50);
    },

    // צור אירוע חדש עם שם מותאם
    async createNewEventWithName(userId, eventName) {
        console.log('🎉 יוצר אירוע חדש:', eventName);

        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = window.sessionManager?.sessionId || sessionStorage.getItem('slotMachineSessionId');

        // שמור קודם ב-localStorage
        await this.saveToLocalStorage();

        // קרא מלאי נוכחי
        let inventory = [];
        const savedInventory = localStorage.getItem('customImages');
        if (savedInventory) {
            try {
                inventory = JSON.parse(savedInventory);
            } catch (e) {
                console.warn('⚠️ לא ניתן לקרוא מלאי');
            }
        }

        // קבל פרטי משתמש
        const user = userAuthManager.currentUser;
        const userName = user.displayName || user.email;

        const newEvent = {
            name: eventName,
            location: '',
            eventDate: null,
            description: '',
            ownerId: userId,
            ownerName: userName,
            sessionId: sessionId,
            status: 'active',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            settings: {
                winFrequency: gameState.winFrequency,
                randomBonusPercent: gameState.randomBonusPercent,
                soundEnabled: gameState.soundEnabled,
                gameMode: gameState.mode,
                backgroundColor: gameState.backgroundColor || '#000000',
                whatsappNumber: gameState.whatsappNumber || ''
            },
            stats: {
                totalPlayers: 0,
                totalWinners: 0,
                totalSpins: 0
            },
            inventory: inventory
        };

        await firebase.database().ref(`events/${eventId}`).set(newEvent);

        // עדכן סטטיסטיקות משתמש
        const userRef = firebase.database().ref(`users/${userId}/stats`);
        const statsSnapshot = await userRef.once('value');
        const currentStats = statsSnapshot.val() || { totalEvents: 0 };

        await userRef.update({
            totalEvents: (currentStats.totalEvents || 0) + 1
        });

        console.log('✅ אירוע חדש נוצר:', eventId);

        // עבור לדשבורד
        alert(`✅ אירוע "${eventName}" נוצר בהצלחה!\n\nמעביר אותך לדשבורד לניהול האירועים שלך.`);
        window.location.href = 'dashboard.html';
    },

    // שמור ב-localStorage
    async saveToLocalStorage() {
        console.log('💾 שומר ב-localStorage...');

        localStorage.setItem('winFrequency', gameState.winFrequency);
        localStorage.setItem('randomBonusPercent', gameState.randomBonusPercent);
        localStorage.setItem('soundEnabled', gameState.soundEnabled);
        localStorage.setItem('gameMode', gameState.mode);

        if (gameState.backgroundColor) {
            localStorage.setItem('backgroundColor', gameState.backgroundColor);
        }

        if (gameState.whatsappNumber) {
            localStorage.setItem('whatsappNumber', gameState.whatsappNumber);
        }

        localStorage.setItem('simpleWinScreen', gameState.simpleWinScreen);

        // שמור טקסט נגלל וגודל גופן
        localStorage.setItem('scrollingBannerText', gameState.scrollingBannerText || '');
        localStorage.setItem('scrollingBannerFontSize', gameState.scrollingBannerFontSize || 42);

        // שמור צלילים מותאמים
        if (typeof saveCustomSounds === 'function') {
            saveCustomSounds();
        }

        console.log('✅ נשמר ב-localStorage');
    },

    // שמור ב-Firebase Session
    async saveToFirebaseSession() {
        if (!window.sessionManager || !sessionManager.sessionId) {
            console.log('⚠️ אין session פעיל - מדלג על שמירה ב-Firebase Session');
            return;
        }

        console.log('☁️ שומר ב-Firebase Session...');

        // שמור פרסים
        if (window.dynamicImagesManager) {
            await dynamicImagesManager.saveToFirebase(sessionManager.sessionId);
            console.log('✅ פרסים נשמרו ב-Firebase');
        }

        // שמור הגדרות משחק
        const gameSettings = {
            winFrequency: gameState.winFrequency,
            randomBonusPercent: gameState.randomBonusPercent,
            soundEnabled: gameState.soundEnabled,
            gameMode: gameState.mode,
            backgroundColor: gameState.backgroundColor || '#000000',
            whatsappNumber: gameState.whatsappNumber || '',
            simpleWinScreen: gameState.simpleWinScreen || false,
            qrCustomText: gameState.qrCustomText || '',
            scrollingBannerText: gameState.scrollingBannerText || '',
            scrollingBannerFontSize: gameState.scrollingBannerFontSize || 42,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };

        await firebase.database().ref(`sessions/${sessionManager.sessionId}/gameSettings`).set(gameSettings);
        console.log('✅ הגדרות משחק נשמרו ב-Firebase Session');
    },

    // סגור session ישן של אירוע (אם קיים)
    async closeOldEventSession(eventId) {
        try {
            // טען את האירוע מ-Firebase
            const eventSnapshot = await firebase.database().ref(`events/${eventId}`).once('value');
            if (!eventSnapshot.exists()) {
                return; // אין אירוע - שום דבר לעשות
            }

            const eventData = eventSnapshot.val();
            const oldSessionId = eventData.sessionId;

            if (!oldSessionId) {
                return; // אין session ישן
            }

            // בדוק אם ה-session הישן עדיין פעיל
            const oldSessionSnapshot = await firebase.database().ref(`sessions/${oldSessionId}`).once('value');
            if (!oldSessionSnapshot.exists()) {
                return; // Session לא קיים יותר
            }

            const oldSessionData = oldSessionSnapshot.val();
            if (!oldSessionData.sessionActive) {
                return; // Session כבר לא פעיל
            }

            console.log('🔄 סוגר session ישן של האירוע:', oldSessionId);

            // ✅ סמן את ה-session הישן כסגור
            await firebase.database().ref(`sessions/${oldSessionId}`).update({
                sessionActive: false,
                closedAt: firebase.database.ServerValue.TIMESTAMP,
                closedReason: 'new_session_opened' // סיבה: session חדש נפתח
            });

            console.log('✅ Session ישן נסגר בהצלחה');
        } catch (error) {
            console.error('❌ שגיאה בסגירת session ישן:', error);
        }
    },


    // עדכן אירוע קיים ב-Firebase
    async updateEvent(userId) {
        console.log('🔄 מעדכן אירוע קיים:', this.currentEventId);

        // ✅ בדוק אם יש session חדש שצריך לעדכן
        const currentSessionId = sessionManager.sessionId || sessionStorage.getItem('slotMachineSessionId');

        // טען את האירוע הנוכחי כדי לבדוק את ה-sessionId שלו
        const eventSnapshot = await firebase.database().ref(`events/${this.currentEventId}`).once('value');
        const eventData = eventSnapshot.val();
        const oldSessionId = eventData?.sessionId;

        // אם יש session חדש והוא שונה מהישן - סגור את הישן
        if (currentSessionId && oldSessionId && currentSessionId !== oldSessionId) {
            console.log('🔄 מזהה session חדש - סוגר את הישן');
            await this.closeOldEventSession(this.currentEventId);
        }

        // קרא מלאי נוכחי
        let inventory = [];
        const savedInventory = localStorage.getItem('customImages');
        if (savedInventory) {
            try {
                inventory = JSON.parse(savedInventory);
            } catch (e) {
                console.warn('⚠️ לא ניתן לקרוא מלאי');
            }
        }

        const eventRef = firebase.database().ref(`events/${this.currentEventId}`);

        // עדכן את השדות הרלוונטיים כולל sessionId החדש
        const updateData = {
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            settings: {
                winFrequency: gameState.winFrequency,
                randomBonusPercent: gameState.randomBonusPercent,
                soundEnabled: gameState.soundEnabled,
                gameMode: gameState.mode,
                backgroundColor: gameState.backgroundColor || '#000000',
                whatsappNumber: gameState.whatsappNumber || ''
            },
            inventory: inventory
        };

        // ✅ עדכן גם את sessionId אם יש session פעיל
        if (currentSessionId) {
            updateData.sessionId = currentSessionId;
        }

        await eventRef.update(updateData);

        console.log('✅ אירוע עודכן בהצלחה');
    }
};

// אתחול אוטומטי
if (typeof window !== 'undefined') {
    window.eventSettingsManager = eventSettingsManager;

    // אתחל כש-DOM מוכן (async!)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => await eventSettingsManager.init());
    } else {
        eventSettingsManager.init(); // אתחול async
    }
}
