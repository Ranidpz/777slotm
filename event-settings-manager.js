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
            // ✅ יש eventId ב-URL - טען את האירוע (ללא בדיקת בעלות!)
            // המשחק פתוח לכולם לצפייה ומשחק - בעלות נבדקת רק בשמירה
            this.currentEventId = eventIdFromUrl;
            localStorage.setItem('currentEventId', eventIdFromUrl);
            console.log('✅ אירוע נטען:', eventIdFromUrl);

            // ✅ טען הגדרות מה-Firebase
            await this.loadEventSettingsFromFirebase(eventIdFromUrl);
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

    // טען הגדרות אירוע מ-Firebase
    async loadEventSettingsFromFirebase(eventId) {
        try {
            console.log('☁️ טוען הגדרות אירוע מ-Firebase:', eventId);

            // ✅ בדוק ש-Firebase נטען (בדיקה בטוחה!)
            let firebaseReady = false;

            try {
                firebaseReady = typeof firebase !== 'undefined' &&
                               firebase.apps &&
                               firebase.apps.length > 0 &&
                               typeof firebase.database === 'function';
            } catch (e) {
                firebaseReady = false;
            }

            if (!firebaseReady) {
                console.error('❌ Firebase לא נטען עדיין - מנסה לאתחל...');

                // נסה לאתחל Firebase
                if (typeof initFirebase === 'function') {
                    initFirebase();
                }

                // המתן שנייה אחת
                await new Promise(resolve => setTimeout(resolve, 1000));

                // בדוק שוב
                try {
                    firebaseReady = typeof firebase !== 'undefined' &&
                                   firebase.apps &&
                                   firebase.apps.length > 0 &&
                                   typeof firebase.database === 'function';
                } catch (e) {
                    firebaseReady = false;
                }

                if (!firebaseReady) {
                    console.error('❌ Firebase לא נטען אחרי אתחול');
                    return;
                }

                console.log('✅ Firebase אותחל בהצלחה');
            }

            // טען את האירוע מ-Firebase
            const eventSnapshot = await firebase.database().ref(`events/${eventId}`).once('value');
            const eventData = eventSnapshot.val();

            if (!eventData) {
                console.warn('⚠️ אין נתוני אירוע ב-Firebase');
                return;
            }

            // טען הגדרות ל-gameState
            if (eventData.settings && typeof window.gameState !== 'undefined') {
                const settings = eventData.settings;

                console.log('📦 הגדרות שנמצאו ב-Firebase:', {
                    winFrequency: settings.winFrequency,
                    backgroundColor: settings.backgroundColor,
                    scrollingBannerText: settings.scrollingBannerText,
                    simpleWinScreen: settings.simpleWinScreen,
                    inventoryCount: eventData.inventory ? eventData.inventory.length : 0
                });

                if (settings.winFrequency !== undefined) gameState.winFrequency = settings.winFrequency;
                if (settings.randomBonusPercent !== undefined) gameState.randomBonusPercent = settings.randomBonusPercent;
                if (settings.soundEnabled !== undefined) gameState.soundEnabled = settings.soundEnabled;
                if (settings.gameMode !== undefined) gameState.mode = settings.gameMode;
                if (settings.backgroundColor) gameState.backgroundColor = settings.backgroundColor;
                if (settings.whatsappNumber !== undefined) gameState.whatsappNumber = settings.whatsappNumber;
                if (settings.simpleWinScreen !== undefined) gameState.simpleWinScreen = settings.simpleWinScreen;
                if (settings.qrCustomText !== undefined) gameState.qrCustomText = settings.qrCustomText;
                if (settings.simpleWinText !== undefined) gameState.simpleWinText = settings.simpleWinText;
                if (settings.scrollingBannerText !== undefined) gameState.scrollingBannerText = settings.scrollingBannerText;
                if (settings.scrollingBannerFontSize) gameState.scrollingBannerFontSize = settings.scrollingBannerFontSize;

                console.log('✅ הגדרות אירוע נטענו ל-gameState:', {
                    winFrequency: gameState.winFrequency,
                    backgroundColor: gameState.backgroundColor,
                    scrollingBannerText: gameState.scrollingBannerText
                });
            }

            // טען מלאי פרסים ל-localStorage
            if (eventData.inventory) {
                localStorage.setItem('customImages', JSON.stringify(eventData.inventory));
                console.log('✅ מלאי פרסים נטען:', eventData.inventory.length, 'פריטים');

                // עדכן את התמונות בממשק
                if (window.dynamicImagesManager) {
                    dynamicImagesManager.loadFromLocalStorage();
                }
            }

            // שמור הגדרות ב-localStorage
            await this.saveToLocalStorage();

            // עדכן את הממשק עם ההגדרות החדשות
            if (typeof applyDynamicImages === 'function') {
                applyDynamicImages();
            }

            // עדכן רקע
            if (gameState.backgroundColor && document.body) {
                document.body.style.backgroundColor = gameState.backgroundColor;
            }

            // עדכן פס נגלל
            if (typeof updateScrollingBanner === 'function') {
                updateScrollingBanner();
            }

            console.log('✅ כל הגדרות האירוע נטענו מ-Firebase ועודכנו בממשק');
        } catch (error) {
            console.error('❌ שגיאה בטעינת הגדרות אירוע:', error);
        }
    },

    // בדוק אם המשתמש הנוכחי הוא הבעלים של האירוע
    async checkOwnership(eventId) {
        try {
            console.log('🔍 בודק בעלות על האירוע:', eventId);

            // ✅ בדוק ש-Firebase נטען (בדיקה בטוחה!)
            let firebaseReady = false;
            try {
                firebaseReady = typeof firebase !== 'undefined' &&
                               firebase.apps &&
                               firebase.apps.length > 0 &&
                               typeof firebase.database === 'function';
            } catch (e) {
                firebaseReady = false;
            }

            if (!firebaseReady) {
                console.error('❌ Firebase לא נטען - לא ניתן לבדוק בעלות');
                throw new Error('Firebase לא נטען');
            }

            // ✅ בדוק אם המשתמש כבר מחובר
            const currentUserId = userAuthManager.getUserId();

            if (!currentUserId) {
                console.warn('⚠️ משתמש לא מחובר');
                return { isOwner: false, userLoggedIn: false };
            }

            console.log('👤 משתמש מחובר:', currentUserId);

            // ✅ טען נתוני אירוע מ-Firebase
            console.log('📖 קורא נתוני אירוע מ-Firebase...');
            const eventSnapshot = await firebase.database().ref(`events/${eventId}`).once('value');

            if (!eventSnapshot.exists()) {
                console.warn('⚠️ האירוע לא קיים:', eventId);
                return { isOwner: false, userLoggedIn: true };
            }

            const eventData = eventSnapshot.val();
            const eventOwnerId = eventData.ownerId;

            console.log('🔑 בעלים של האירוע:', eventOwnerId);

            // ✅ בדוק אם המשתמש הנוכחי הוא הבעלים
            if (currentUserId === eventOwnerId) {
                console.log('✅ משתמש הוא בעלים של האירוע');
                return { isOwner: true, userLoggedIn: true };
            } else {
                console.warn('⚠️ משתמש אינו בעלים של האירוע');
                return { isOwner: false, userLoggedIn: true };
            }
        } catch (error) {
            console.error('❌ שגיאה בבדיקת בעלות:', error.message || error);
            throw error; // זרוק את השגיאה כדי שה-timeout יתפוס
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
            'mobileWarningDismissed',
            'customImages',
            'remoteControlEnabled',
            'slotMachineSessionId'
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

        // הגדר ברירות מחדל חדשות
        localStorage.setItem('scrollingBannerText', 'ברוכים הבאים למשחק 777.playzones.app לסיבוב הגלגל לחצו על המסך או על מקש Enter במקלדת. למסך ההגדרות לחצו S. תהנו!');
        localStorage.setItem('remoteControlEnabled', 'false');

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

    // Helper: הוסף timeout לפעולה async
    withTimeout(promise, timeoutMs, operationName) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${operationName} - timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
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
        console.log('👤 User ID:', userId);

        // ✅ בדיקה 2: האם יש אירוע ב-URL?
        if (this.hasEvent()) {
            console.log('📝 יש אירוע - בודק בעלות...');

            // יש אירוע - בדוק בעלות (עם timeout של 10 שניות)
            let ownershipCheck;
            try {
                ownershipCheck = await this.withTimeout(
                    this.checkOwnership(this.currentEventId),
                    10000,
                    'בדיקת בעלות'
                );
                console.log('✅ בדיקת בעלות הושלמה:', ownershipCheck);
            } catch (error) {
                console.error('❌ שגיאה או timeout בבדיקת בעלות:', error.message || error);

                let errorMsg = 'שגיאה בחיבור ל-Firebase';
                if (error.message && error.message.includes('timeout')) {
                    errorMsg = 'בדיקת בעלות לקחה יותר מדי זמן';
                } else if (error.message && error.message.includes('Firebase לא נטען')) {
                    errorMsg = 'Firebase לא נטען. רענן את הדף ונסה שוב';
                }

                alert(`❌ ${errorMsg}\n\nבדוק את החיבור לאינטרנט ונסה שוב.`);
                return false;
            }

            if (!ownershipCheck.isOwner) {
                // לא בעלים - הצג מודל "אין הרשאה"
                console.warn('⚠️ משתמש אינו בעלים - מציג מודל הרשאה');
                this.showNoPermissionModal();
                return false;
            }

            // בעלים - עדכן את האירוע
            console.log('💾 משתמש הוא בעלים - מתחיל שמירה...');
            try {
                // שלב 1: localStorage (מהיר, ללא timeout)
                console.log('1️⃣ שומר ב-localStorage...');
                await this.saveToLocalStorage();
                console.log('✅ localStorage הושלם');

                // שלב 2: Firebase Session (עם timeout של 20 שניות)
                console.log('2️⃣ שומר ב-Firebase Session...');
                try {
                    await this.withTimeout(
                        this.saveToFirebaseSession(),
                        20000,
                        'שמירת Firebase Session'
                    );
                    console.log('✅ Firebase Session הושלם');
                } catch (sessionError) {
                    console.warn('⚠️ שמירת Session נכשלה או timeout:', sessionError.message);
                    console.log('⏩ ממשיך לשמירת אירוע (Session לא קריטי)');
                    // לא זורקים שגיאה - ממשיכים לשמור את האירוע
                }

                // שלב 3: עדכון אירוע (עם timeout של 15 שניות)
                console.log('3️⃣ מעדכן אירוע ב-Firebase...');
                await this.withTimeout(
                    this.updateEvent(userId),
                    15000,
                    'עדכון אירוע'
                );
                console.log('✅ Firebase Event עודכן');

                console.log('✅✅✅ אירוע עודכן בהצלחה!');
                return true;
            } catch (error) {
                console.error('❌ שגיאה בעדכון אירוע:', error);

                // הצג הודעה מפורטת יותר
                let errorMsg = 'שגיאה בשמירת הגדרות';
                if (error.message.includes('timeout')) {
                    errorMsg = 'החיבור ל-Firebase איטי מדי או נכשל. בדוק את החיבור לאינטרנט ונסה שוב.';
                } else if (error.message.includes('permission')) {
                    errorMsg = 'אין הרשאה לשמור. נסה להתנתק ולהתחבר שוב.';
                }

                alert(`❌ ${errorMsg}\n\nפרטי שגיאה: ${error.message}`);
                return false;
            }
        } else {
            // אין אירוע - הצג מודל יצירת אירוע חדש
            console.log('🆕 אין אירוע - מציג מודל יצירה');
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
                whatsappNumber: gameState.whatsappNumber || '',
                scrollingBannerText: gameState.scrollingBannerText || '',
                scrollingBannerFontSize: gameState.scrollingBannerFontSize || 42,
                simpleWinScreen: gameState.simpleWinScreen || false,
                qrCustomText: gameState.qrCustomText || '',
                simpleWinText: gameState.simpleWinText || ''
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

        // הצג מודל הצלחה ועבור לדשבורד
        this.showSuccessModal(eventName);
    },

    // הצג מודל הצלחה לאחר יצירת אירוע
    showSuccessModal(eventName) {
        const modal = document.createElement('div');
        modal.id = 'success-modal';
        modal.className = 'auth-modal show';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2 style="color: #4CAF50;">אירוע נוצר בהצלחה!</h2>
                    <p>האירוע "${eventName}" נשמר במערכת</p>
                </div>

                <div class="auth-modal-body">
                    <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
                        מעביר אותך לדשבורד לניהול האירועים שלך...
                    </p>

                    <button class="google-signin-btn" id="go-dashboard-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <span>עבור לדשבורד</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            const dashboardBtn = document.getElementById('go-dashboard-btn');
            if (dashboardBtn) {
                dashboardBtn.onclick = () => {
                    window.location.href = 'dashboard.html';
                };
            }

            // מעבר אוטומטי אחרי 2 שניות
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }, 50);
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
        try {
            if (!window.sessionManager || !sessionManager.sessionId) {
                console.log('⚠️ אין session פעיל - מדלג על שמירה ב-Firebase Session');
                return;
            }

            // ✅ בדוק ש-Firebase נטען (בדיקה בטוחה!)
            let firebaseReady = false;

            try {
                firebaseReady = typeof firebase !== 'undefined' &&
                               firebase.apps &&
                               firebase.apps.length > 0 &&
                               typeof firebase.database === 'function';
            } catch (e) {
                firebaseReady = false;
            }

            if (!firebaseReady) {
                console.warn('⚠️ Firebase לא נטען - מדלג על שמירה ב-Session');
                return;
            }

            console.log('☁️ שומר ב-Firebase Session...');

            // שמור פרסים (עם timeout מוגבל ל-15 שניות)
            if (window.dynamicImagesManager) {
                try {
                    console.log('📦 שומר פרסים ל-Session...');

                    // בדוק גודל המלאי
                    const inventory = localStorage.getItem('customImages');
                    if (inventory) {
                        const sizeKB = new Blob([inventory]).size / 1024;
                        console.log(`📊 גודל מלאי: ${sizeKB.toFixed(2)} KB`);

                        if (sizeKB > 5000) { // יותר מ-5MB
                            console.warn('⚠️ מלאי גדול מדי - מדלג על שמירת פרסים ב-Session');
                            console.log('ℹ️ הפרסים יישמרו רק ב-Event (לא ב-Session)');
                        } else {
                            await this.withTimeout(
                                dynamicImagesManager.saveToFirebase(sessionManager.sessionId),
                                15000,
                                'שמירת פרסים'
                            );
                            console.log('✅ פרסים נשמרו ב-Firebase Session');
                        }
                    }
                } catch (imageError) {
                    console.warn('⚠️ שמירת פרסים נכשלה:', imageError.message);
                    console.log('ℹ️ הפרסים יישמרו ב-Event במקום');
                    // ממשיכים - לא קריטי
                }
            }

            // שמור הגדרות משחק (מהיר)
            console.log('⚙️ שומר הגדרות משחק...');
            const gameSettings = {
                winFrequency: gameState.winFrequency,
                randomBonusPercent: gameState.randomBonusPercent,
                soundEnabled: gameState.soundEnabled,
                gameMode: gameState.mode,
                backgroundColor: gameState.backgroundColor || '#000000',
                whatsappNumber: gameState.whatsappNumber || '',
                simpleWinScreen: gameState.simpleWinScreen || false,
                qrCustomText: gameState.qrCustomText || '',
                simpleWinText: gameState.simpleWinText || '',
                scrollingBannerText: gameState.scrollingBannerText || '',
                scrollingBannerFontSize: gameState.scrollingBannerFontSize || 42,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            };

            await this.withTimeout(
                firebase.database().ref(`sessions/${sessionManager.sessionId}/gameSettings`).set(gameSettings),
                10000,
                'שמירת הגדרות משחק'
            );
            console.log('✅ הגדרות משחק נשמרו ב-Firebase Session');
        } catch (error) {
            console.error('❌ שגיאה בשמירה ב-Firebase Session:', error);
            console.warn('⚠️ ממשיך בלי שמירת Session - אירוע עדיין יישמר');
            // זורקים את השגיאה כדי שה-catch ב-saveSettings יתפוס
            throw error;
        }
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

        // טען את האירוע הנוכחי כדי לבדוק את ה-sessionId שלו (עם timeout)
        console.log('📖 קורא נתוני אירוע נוכחיים...');
        const eventSnapshot = await this.withTimeout(
            firebase.database().ref(`events/${this.currentEventId}`).once('value'),
            8000,
            'קריאת נתוני אירוע'
        );
        const eventData = eventSnapshot.val();
        const oldSessionId = eventData?.sessionId;

        // אם יש session חדש והוא שונה מהישן - סגור את הישן (עם timeout)
        if (currentSessionId && oldSessionId && currentSessionId !== oldSessionId) {
            console.log('🔄 מזהה session חדש - סוגר את הישן');
            try {
                await this.withTimeout(
                    this.closeOldEventSession(this.currentEventId),
                    5000,
                    'סגירת session ישן'
                );
            } catch (closeError) {
                console.warn('⚠️ לא הצלחתי לסגור session ישן:', closeError.message);
                console.log('⏩ ממשיך בכל מקרה');
                // ממשיכים - לא קריטי
            }
        }

        // קרא מלאי נוכחי
        let inventory = [];
        const savedInventory = localStorage.getItem('customImages');
        if (savedInventory) {
            try {
                inventory = JSON.parse(savedInventory);
                console.log(`📦 נמצאו ${inventory.length} פרסים במלאי`);
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
                whatsappNumber: gameState.whatsappNumber || '',
                scrollingBannerText: gameState.scrollingBannerText || '',
                scrollingBannerFontSize: gameState.scrollingBannerFontSize || 42,
                simpleWinScreen: gameState.simpleWinScreen || false,
                qrCustomText: gameState.qrCustomText || '',
                simpleWinText: gameState.simpleWinText || ''
            },
            inventory: inventory
        };

        // ✅ עדכן גם את sessionId אם יש session פעיל
        if (currentSessionId) {
            updateData.sessionId = currentSessionId;
        }

        console.log('💾 כותב עדכון ל-Firebase...');
        await this.withTimeout(
            eventRef.update(updateData),
            10000,
            'כתיבת עדכון אירוע'
        );

        console.log('✅ אירוע עודכן בהצלחה ב-Firebase');
    },

    // הצג מודאל גישה נדחתה
    showAccessDeniedModal(title, message, redirectUrl) {
        // בדוק אם כבר יש מודל פתוח
        if (document.getElementById('access-denied-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'access-denied-modal';
        modal.className = 'auth-modal show';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2 style="color: #F59E0B;">⚠️ ${title}</h2>
                </div>

                <div class="auth-modal-body">
                    <p style="font-size: 1.1em; margin-bottom: 24px; text-align: center; color: rgba(255,255,255,0.9);">
                        ${message}
                    </p>

                    <button class="google-signin-btn" onclick="window.location.href='${redirectUrl}'" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <span>חזור לדשבורד</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // הוסף סגירה בלחיצה על overlay
        const overlay = modal.querySelector('.auth-modal-overlay');
        overlay.addEventListener('click', () => {
            window.location.href = redirectUrl;
        });
    },

    // הצג spinner טעינה
    showLoadingSpinner() {
        // בדוק אם כבר יש spinner
        if (document.getElementById('loading-spinner')) {
            return;
        }

        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        spinner.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 50px; height: 50px; border: 5px solid rgba(255,215,0,0.2); border-top: 5px solid #FFD700; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <p style="color: #FFD700; font-size: 18px; font-weight: 500;">טוען אירוע...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(spinner);
    },

    // הסתר spinner טעינה
    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
};

// אתחול אוטומטי
if (typeof window !== 'undefined') {
    window.eventSettingsManager = eventSettingsManager;

    // אתחל כש-DOM מוכן (async!)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await eventSettingsManager.init();
        });
    } else {
        // ✅ גם כאן צריך async wrapper!
        (async () => {
            await eventSettingsManager.init();
        })();
    }
}
