// Event Settings Manager
// ניהול שמירת הגדרות ועדכון אירועים ב-Firebase

const eventSettingsManager = {
    currentEventId: null,

    // אתחול - טען eventId אם קיים ובדוק בעלות
    async init() {
        // נסה לטעון eventId מ-localStorage
        this.currentEventId = localStorage.getItem('currentEventId');

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
        }

        console.log('🎯 Event Settings Manager initialized. Current Event ID:', this.currentEventId || 'None');
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

    // שמור הגדרות (דורש התחברות!)
    async saveSettings() {
        console.log('💾 מתחיל שמירת הגדרות...');

        // ✅ בדיקה 1: האם המשתמש מחובר?
        if (!userAuthManager.isLoggedIn()) {
            console.log('⚠️ משתמש לא מחובר - מפנה להתחברות');

            // הצג חלון התחברות
            userAuthManager.requiresAuth(async () => {
                // אחרי התחברות - נסה שוב לשמור
                await this.saveSettings();
            });
            return false;
        }

        // ✅ המשתמש מחובר - המשך בשמירה
        const userId = userAuthManager.getUserId();

        try {
            // 1. שמור ב-localStorage (לשימוש מקומי offline)
            await this.saveToLocalStorage();

            // 2. שמור ב-Firebase Session (לשלט מרחוק)
            await this.saveToFirebaseSession();

            // 3. צור/עדכן Event ב-Firebase
            if (this.hasEvent()) {
                // יש אירוע קיים - עדכן אותו
                await this.updateEvent(userId);
            } else {
                // אין אירוע - צור חדש
                await this.createNewEvent(userId);
            }

            console.log('✅ כל ההגדרות נשמרו בהצלחה!');
            return true;
        } catch (error) {
            console.error('❌ שגיאה בשמירת הגדרות:', error);
            alert('❌ שגיאה בשמירת הגדרות. נסה שוב.');
            return false;
        }
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

    // צור אירוע חדש ב-Firebase
    async createNewEvent(userId) {
        console.log('🎉 יוצר אירוע חדש...');

        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = sessionManager.sessionId || sessionStorage.getItem('slotMachineSessionId');

        // שם אירוע - תאריך נוכחי
        const today = new Date();
        const dateStr = today.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const eventName = `אירוע ב-${dateStr}`;

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
            description: 'אירוע שנוצר מתוך המשחק',
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

        // שמור את ה-eventId
        this.currentEventId = eventId;
        localStorage.setItem('currentEventId', eventId);

        // ✅ עדכן את ה-URL עם event ו-session (ללא רענון דף!)
        const newUrl = `${window.location.pathname}?event=${eventId}&session=${sessionId}`;
        window.history.pushState({ eventId, sessionId }, '', newUrl);
        console.log('🔗 URL עודכן:', newUrl);

        console.log('✅ אירוע חדש נוצר:', eventId);
        alert(`✅ אירוע "${eventName}" נוצר בהצלחה!\n\nמעכשיו כל שמירה תעדכן את האירוע הזה.`);
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
