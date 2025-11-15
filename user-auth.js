// User Authentication Manager for Index.html
// ניהול התחברות משתמשים מתוך מסך המשחק

const userAuthManager = {
    currentUser: null,
    database: null,

    // אתחול
    init() {
        console.log('🔐 מאתחל מערכת משתמשים במשחק');

        // אתחל Firebase
        if (typeof initFirebase === 'function') {
            this.database = initFirebase();
        }

        // בדוק אם יש משתמש מחובר
        this.checkAuthState();
    },

    // בדוק מצב התחברות
    checkAuthState() {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase לא נטען');
            return;
        }

        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                console.log('✅ משתמש מחובר:', user.email);
                this.updateUIForLoggedInUser();
            } else {
                this.currentUser = null;
                console.log('👤 משתמש אורח (לא רשום)');
                this.updateUIForGuest();
            }
        });
    },

    // עדכן ממשק למשתמש מחובר
    updateUIForLoggedInUser() {
        // הסר נעילה מכפתורי הגדרות
        this.unlockSettingsButtons();

        // הצג שם משתמש בממשק (אם יש)
        const userNameDisplay = document.getElementById('current-user-name');
        if (userNameDisplay) {
            userNameDisplay.textContent = this.currentUser.displayName || this.currentUser.email;
        }
    },

    // עדכן ממשק למשתמש אורח
    updateUIForGuest() {
        // נעל כפתורי הגדרות
        this.lockSettingsButtons();
    },

    // נעל כפתורי הגדרות
    lockSettingsButtons() {
        const settingsButtons = document.querySelectorAll('.settings-action-btn');
        settingsButtons.forEach(btn => {
            btn.setAttribute('data-requires-auth', 'true');
        });
    },

    // בטל נעילה של כפתורי הגדרות
    unlockSettingsButtons() {
        const settingsButtons = document.querySelectorAll('.settings-action-btn');
        settingsButtons.forEach(btn => {
            btn.removeAttribute('data-requires-auth');
        });
    },

    // בדוק אם פעולה דורשת התחברות
    requiresAuth(callback) {
        if (this.currentUser) {
            // משתמש מחובר - הרץ את הפעולה
            callback();
        } else {
            // משתמש לא מחובר - הצג חלון התחברות
            this.showLoginModal(callback);
        }
    },

    // הצג חלון התחברות
    showLoginModal(afterLoginCallback = null) {
        // יצירת מודל התחברות דינמי
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>🎰 התחבר למערכת</h2>
                    <p>נדרשת התחברות לביצוע פעולה זו</p>
                </div>

                <div class="auth-modal-body">
                    <button class="google-signin-btn" id="modal-google-signin">
                        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>התחבר עם Google</span>
                    </button>

                    <div class="auth-info">
                        <p>💡 ההתחברות מאפשרת לך:</p>
                        <ul>
                            <li>ניהול פרסים ומלאי</li>
                            <li>יצירת אירועים מרובים</li>
                            <li>צפייה בלוח זוכים</li>
                            <li>שמירת הגדרות ענן</li>
                        </ul>
                    </div>
                </div>

                <div class="auth-modal-footer">
                    <button class="cancel-btn" id="modal-cancel-btn">ביטול</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // הוסף אירועים
        document.getElementById('modal-google-signin').addEventListener('click', async () => {
            await this.signInWithGoogle(afterLoginCallback);
        });

        document.getElementById('modal-cancel-btn').addEventListener('click', () => {
            this.closeLoginModal();
        });

        // סגור בלחיצה על הרקע
        modal.querySelector('.auth-modal-overlay').addEventListener('click', () => {
            this.closeLoginModal();
        });

        // הצג את המודל
        setTimeout(() => modal.classList.add('show'), 10);
    },

    // סגור חלון התחברות
    closeLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    },

    // התחבר עם Google
    async signInWithGoogle(afterLoginCallback = null) {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;

            console.log('✅ התחברות הצליחה:', user.email);

            // צור/עדכן פרופיל משתמש
            const isNewUser = await this.createOrUpdateUserProfile(user);

            // סגור את המודל
            this.closeLoginModal();

            // הצג הודעת הצלחה
            alert('✅ התחברת בהצלחה!');

            // אם זה משתמש חדש - צור אירוע ראשון ועבור לדשבורד
            if (isNewUser) {
                await this.handleNewUserFirstEvent(user);
            } else {
                // משתמש קיים - בדוק אם יש sessionId נוכחי
                const currentSessionId = this.getCurrentSessionId();

                if (currentSessionId) {
                    // יש סשן פעיל - צור אירוע חדש מהסשן ועבור לדשבורד
                    await this.createEventFromCurrentSession(user, currentSessionId);
                } else if (afterLoginCallback && typeof afterLoginCallback === 'function') {
                    // אין סשן - הרץ callback רגיל
                    afterLoginCallback();
                }
            }

            return user;
        } catch (error) {
            console.error('❌ שגיאת התחברות:', error);

            let errorMessage = 'שגיאה בהתחברות';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'חלון ההתחברות נסגר';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = 'התחברות בוטלה';
            }

            alert(errorMessage);
            return null;
        }
    },

    // צור או עדכן פרופיל משתמש
    async createOrUpdateUserProfile(user) {
        const userRef = firebase.database().ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            // משתמש חדש - צור פרופיל
            const newUser = {
                email: user.email,
                displayName: user.displayName || 'משתמש חדש',
                photoURL: user.photoURL || null,
                role: 'event_manager', // ברירת מחדל - מפיק
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                permissions: {
                    canCreateEvents: true,
                    canDeleteEvents: true,  // ✅ מפיקים יכולים למחוק אירועים
                    canManageInventory: true,
                    canEditEvents: true,
                    maxActiveSessions: 10
                },
                stats: {
                    totalEvents: 0,
                    totalWinners: 0,
                    totalSpins: 0
                }
            };

            await userRef.set(newUser);
            console.log('✅ פרופיל משתמש חדש נוצר');
            return true; // משתמש חדש
        } else {
            // משתמש קיים - עדכן פרטים
            await userRef.update({
                displayName: user.displayName || snapshot.val().displayName,
                photoURL: user.photoURL || snapshot.val().photoURL,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('✅ פרופיל משתמש עודכן');
            return false; // משתמש קיים
        }
    },

    // טיפול במשתמש חדש - צור אירוע ראשון ועבור לדשבורד
    async handleNewUserFirstEvent(user) {
        console.log('🎉 משתמש חדש! יוצר אירוע ראשון...');

        try {
            // צור אירוע ראשון אוטומטי
            const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const sessionId = `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const defaultEventName = `האירוע הראשון של ${user.displayName || 'שלי'}`;

            const newEvent = {
                name: defaultEventName,
                location: '',
                eventDate: null,
                description: 'אירוע ראשון שנוצר אוטומטית',
                ownerId: user.uid,
                ownerName: user.displayName || user.email,
                sessionId,
                status: 'active',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                stats: {
                    totalPlayers: 0,
                    totalWinners: 0,
                    totalSpins: 0
                }
            };

            await firebase.database().ref(`events/${eventId}`).set(newEvent);

            // עדכן סטטיסטיקות משתמש
            const userRef = firebase.database().ref(`users/${user.uid}/stats`);
            await userRef.update({
                totalEvents: 1
            });

            console.log('✅ אירוע ראשון נוצר:', eventId);

            // הצג הודעה והעבר לדשבורד
            if (confirm('🎉 ברוך הבא! נוצר לך אירוע ראשון.\n\nהאם לעבור לדשבורד לניהול האירוע?')) {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('❌ שגיאה ביצירת אירוע ראשון:', error);
            alert('⚠️ התחברת בהצלחה, אך הייתה בעיה ביצירת האירוע הראשון. נסה ליצור אירוע ידנית בדשבורד.');

            if (confirm('לעבור לדשבורד?')) {
                window.location.href = 'dashboard.html';
            }
        }
    },

    // התנתק
    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('👋 התנתקת בהצלחה');
            alert('התנתקת בהצלחה');
            window.location.reload();
        } catch (error) {
            console.error('❌ שגיאה בהתנתקות:', error);
            alert('שגיאה בהתנתקות');
        }
    },

    // בדוק אם המשתמש מחובר
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // קבל UID של המשתמש
    getUserId() {
        return this.currentUser?.uid || null;
    },

    // קבל את ה-sessionId הנוכחי מה-sessionStorage
    getCurrentSessionId() {
        return sessionStorage.getItem('slotMachineSessionId') || null;
    },

    // צור אירוע חדש מהסשן הנוכחי והישאר באותו דף
    async createEventFromCurrentSession(user, currentSessionId) {
        console.log('🎉 יוצר אירוע חדש מהסשן הנוכחי...');

        try {
            const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // קרא נתוני מלאי נוכחיים מ-localStorage אם יש
            let inventory = [];
            const savedInventory = localStorage.getItem('customImages');
            if (savedInventory) {
                try {
                    inventory = JSON.parse(savedInventory);
                } catch (e) {
                    console.warn('⚠️ לא ניתן לקרוא מלאי מ-localStorage');
                }
            }

            // שם אירוע - תאריך נוכחי
            const today = new Date();
            const dateStr = today.toLocaleDateString('he-IL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const defaultEventName = `אירוע ב-${dateStr}`;

            const newEvent = {
                name: defaultEventName,
                location: '',
                eventDate: null,
                description: 'אירוע שנוצר מתוך המשחק',
                ownerId: user.uid,
                ownerName: user.displayName || user.email,
                sessionId: currentSessionId,  // ✅ קישור לסשן הנוכחי
                status: 'active',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                stats: {
                    totalPlayers: 0,
                    totalWinners: 0,
                    totalSpins: 0
                },
                inventory: inventory  // ✅ שמור את המלאי הנוכחי
            };

            await firebase.database().ref(`events/${eventId}`).set(newEvent);

            // עדכן סטטיסטיקות משתמש
            const userRef = firebase.database().ref(`users/${user.uid}/stats`);
            const statsSnapshot = await userRef.once('value');
            const currentStats = statsSnapshot.val() || { totalEvents: 0 };

            await userRef.update({
                totalEvents: (currentStats.totalEvents || 0) + 1
            });

            console.log('✅ אירוע חדש נוצר:', eventId);

            // ✅ שמור את ה-eventId ב-localStorage (קישור לאירוע)
            localStorage.setItem('currentEventId', eventId);

            // ✅ עדכן את ה-URL עם event ו-session (ללא רענון דף!)
            const newUrl = `${window.location.pathname}?event=${eventId}&session=${currentSessionId}`;
            window.history.pushState({ eventId, sessionId: currentSessionId }, '', newUrl);
            console.log('🔗 URL עודכן:', newUrl);

            // ✅ הצג הודעה קטנה ונעימה - לא לעבור לדשבורד!
            alert(`✅ אירוע "${defaultEventName}" נוצר בהצלחה!\n\nמעכשיו כל שמירה תעדכן את האירוע הזה.`);

            return eventId;
        } catch (error) {
            console.error('❌ שגיאה ביצירת אירוע:', error);
            alert('⚠️ התחברת בהצלחה, אך הייתה בעיה ביצירת האירוע.');
            return null;
        }
    }
};

// ייצוא גלובלי
window.userAuthManager = userAuthManager;
