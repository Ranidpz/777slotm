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
            } else {
                this.currentUser = null;
                console.log('👤 משתמש אורח (לא רשום)');
            }
        });
    },

    // בדוק אם מחובר
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // המתן למצב אימות (Promise-based)
    waitForAuthState() {
        return new Promise((resolve) => {
            // אם כבר יש משתמש - החזר מיד
            if (this.currentUser) {
                resolve(this.currentUser);
                return;
            }

            // אם Firebase לא טעון - החזר null
            if (typeof firebase === 'undefined' || !firebase.auth) {
                resolve(null);
                return;
            }

            // האזן לשינוי מצב אימות (רק פעם אחת)
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe(); // הסר מאזין אחרי שמתקבל התשובה
                resolve(user);
            });
        });
    },

    // קבל UID של המשתמש
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    },

    // הצג מודל התחברות
    showLoginModal(afterLoginCallback = null) {
        // שמור callback
        window._authCallback = afterLoginCallback;

        // בדוק אם כבר יש מודל פתוח
        if (document.getElementById('auth-modal')) {
            return;
        }

        // צור מודל
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'auth-modal show';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>התחבר למערכת</h2>
                    <p>נדרשת התחברות לשמירת הגדרות</p>
                </div>

                <div class="auth-modal-body">
                    <button class="google-signin-btn" id="google-signin-btn">
                        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>התחבר עם Google</span>
                    </button>
                </div>

                <div class="auth-modal-footer">
                    <button class="cancel-btn" id="cancel-signin-btn">ביטול</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // הוסף event listeners אחרי שהמודל נוסף ל-DOM
        setTimeout(() => {
            const googleBtn = document.getElementById('google-signin-btn');
            const cancelBtn = document.getElementById('cancel-signin-btn');
            const overlay = modal.querySelector('.auth-modal-overlay');

            if (googleBtn) {
                googleBtn.onclick = () => {
                    console.log('🔵 נלחץ כפתור התחברות');
                    this.signInWithGoogle();
                };
            }

            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    console.log('🔴 נלחץ ביטול');
                    this.closeLoginModal();
                };
            }

            if (overlay) {
                overlay.onclick = () => {
                    this.closeLoginModal();
                };
            }
        }, 50);
    },

    // סגור מודל התחברות
    closeLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.remove();
        }
    },

    // התחבר עם Google
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;

            console.log('✅ התחברות הצליחה:', user.email);

            // צור/עדכן פרופיל משתמש
            await this.createOrUpdateUserProfile(user);

            // סגור מודל
            this.closeLoginModal();

            // הרץ callback אם יש
            if (window._authCallback && typeof window._authCallback === 'function') {
                window._authCallback();
                window._authCallback = null;
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
            // משתמש חדש
            const newUser = {
                email: user.email,
                displayName: user.displayName || 'משתמש חדש',
                photoURL: user.photoURL || null,
                role: 'event_manager',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                permissions: {
                    canCreateEvents: true,
                    canDeleteEvents: true,
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
        } else {
            // משתמש קיים
            await userRef.update({
                displayName: user.displayName || snapshot.val().displayName,
                photoURL: user.photoURL || snapshot.val().photoURL,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('✅ פרופיל משתמש עודכן');
        }
    },

    // התנתק
    async signOut() {
        try {
            await firebase.auth().signOut();
            this.currentUser = null;
            console.log('👋 התנתקת בהצלחה');
        } catch (error) {
            console.error('❌ שגיאה בהתנתקות:', error);
        }
    }
};

// אתחול אוטומטי כאשר הדף נטען
document.addEventListener('DOMContentLoaded', () => {
    userAuthManager.init();
});
