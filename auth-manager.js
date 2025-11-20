// Auth Manager - ניהול משתמשים והתחברות
// מערכת התחברות עם Google Authentication

const authManager = {
    currentUser: null,
    userProfile: null,

    // אתחול Firebase Auth
    init() {
        console.log('🔐 מאתחל מערכת משתמשים');

        // ✅ אתחל Firebase לפני שמשתמשים בו
        if (typeof initFirebase === 'function') {
            initFirebase();
        }

        // האזן לשינויי מצב התחברות
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ משתמש מחובר:', user.email);
                await this.handleUserLogin(user);
            } else {
                console.log('❌ משתמש לא מחובר');
                this.handleUserLogout();
            }
        });
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

    // התנתק
    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('👋 התנתקת בהצלחה');

            // נקה localStorage
            localStorage.removeItem('currentEventId');

            window.location.reload();
        } catch (error) {
            console.error('❌ שגיאה בהתנתקות:', error);
            alert('שגיאה בהתנתקות');
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
                    canDeleteEvents: true,  // ✅ מפיקים יכולים למחוק אירועים שלהם
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
            console.log('✅ פרופיל משתמש נוצר');
        } else {
            // משתמש קיים - עדכן פרטים
            await userRef.update({
                displayName: user.displayName || snapshot.val().displayName,
                photoURL: user.photoURL || snapshot.val().photoURL,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('✅ פרופיל משתמש עודכן');
        }
    },

    // טיפול בהתחברות משתמש
    async handleUserLogin(user) {
        this.currentUser = user;

        // קרא פרטי משתמש מ-Firebase
        const userRef = firebase.database().ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {
            this.userProfile = userData;
            this.currentUser.role = userData.role;
            this.currentUser.permissions = userData.permissions;

            console.log(`👤 תפקיד: ${userData.role}`);

            // הסתר spinner והצג דשבורד
            this.hideLoadingSpinner();
            this.showDashboard();
        } else {
            console.error('❌ לא נמצא פרופיל משתמש');
            await this.signOut();
        }
    },

    // טיפול בהתנתקות
    handleUserLogout() {
        this.currentUser = null;
        this.userProfile = null;

        // הסתר spinner והצג מסך התחברות
        this.hideLoadingSpinner();
        this.showLoginScreen();
    },

    // הסתר spinner טעינה
    hideLoadingSpinner() {
        const spinner = document.getElementById('auth-loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    },

    // הצג מסך התחברות
    showLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardContainer = document.getElementById('dashboard-container');

        if (loginScreen) loginScreen.classList.remove('hidden');
        if (dashboardContainer) dashboardContainer.classList.add('hidden');
    },

    // הצג דשבורד
    showDashboard() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardContainer = document.getElementById('dashboard-container');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (dashboardContainer) dashboardContainer.classList.remove('hidden');

        // עדכן פרטי משתמש בממשק
        this.updateUserUI();

        // טען אירועים
        if (window.eventsManager) {
            eventsManager.loadEvents();
        }
    },

    // עדכן פרטי משתמש בממשק
    updateUserUI() {
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const userPhotoElement = document.getElementById('user-photo');
        const userRoleBadge = document.getElementById('user-role-badge');

        if (userNameElement) {
            userNameElement.textContent = this.userProfile.displayName || 'משתמש';
        }

        if (userEmailElement) {
            userEmailElement.textContent = this.userProfile.email;
        }

        if (userPhotoElement && this.userProfile.photoURL) {
            userPhotoElement.src = this.userProfile.photoURL;
        }

        if (userRoleBadge) {
            const roleText = this.isSuperAdmin() ? 'מנהל ראשי' : 'מנהל אירועים';
            userRoleBadge.textContent = roleText;
            userRoleBadge.className = this.isSuperAdmin() ? 'role-badge admin' : 'role-badge manager';
        }

        // הצג/הסתר כפתורי מנהל ראשי
        const adminControls = document.querySelectorAll('.admin-only');
        adminControls.forEach(control => {
            if (this.isSuperAdmin()) {
                control.classList.remove('hidden');
            } else {
                control.classList.add('hidden');
            }
        });
    },

    // בדוק אם המשתמש הוא super admin
    isSuperAdmin() {
        return this.userProfile && this.userProfile.role === 'super_admin';
    },

    // בדוק אם למשתמש יש הרשאה
    hasPermission(permission) {
        if (this.isSuperAdmin()) return true;
        return this.userProfile?.permissions?.[permission] === true;
    },

    // קבל UID של משתמש נוכחי
    getCurrentUserId() {
        return this.currentUser?.uid || null;
    }
};

// אתחול אוטומטי
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        authManager.init();
    }
});

// ייצוא גלובלי
window.authManager = authManager;
