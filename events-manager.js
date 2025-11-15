// Events Manager - ניהול אירועים
// מערכת לניהול, יצירה, ועריכה של אירועים

const eventsManager = {
    events: [],
    filteredEvents: [],
    currentEventId: null,

    // טען אירועים
    async loadEvents() {
        console.log('📊 טוען אירועים...');

        const container = document.getElementById('events-container');
        if (!container) return;

        container.innerHTML = '<div class="loading">⏳ טוען אירועים...</div>';

        try {
            const eventsRef = firebase.database().ref('events');

            // מנהל ראשי - טען את כל האירועים
            if (authManager.isSuperAdmin()) {
                const snapshot = await eventsRef.once('value');
                this.events = [];

                snapshot.forEach((childSnapshot) => {
                    this.events.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                // טען גם סטטיסטיקות
                await this.loadAdminStats();
            }
            // מנהל אירועים - טען רק את האירועים שלו
            else {
                const userId = authManager.getCurrentUserId();
                const snapshot = await eventsRef.orderByChild('ownerId').equalTo(userId).once('value');

                this.events = [];
                snapshot.forEach((childSnapshot) => {
                    this.events.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }

            // מיין לפי תאריך יצירה (החדש ביותר קודם)
            this.events.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            this.filteredEvents = [...this.events];
            this.displayEvents();

            console.log(`✅ נטענו ${this.events.length} אירועים`);
        } catch (error) {
            console.error('❌ שגיאה בטעינת אירועים:', error);
            container.innerHTML = '<div class="no-events">❌ שגיאה בטעינת אירועים</div>';
        }
    },

    // הצג אירועים
    displayEvents() {
        const container = document.getElementById('events-container');
        if (!container) return;

        if (this.filteredEvents.length === 0) {
            container.innerHTML = '<div class="no-events">📭 אין אירועים עדיין.<br><br>צור את האירוע הראשון שלך!</div>';
            return;
        }

        const html = this.filteredEvents.map(event => {
            const date = event.eventDate ? new Date(event.eventDate).toLocaleDateString('he-IL') : 'לא צוין';
            const statusText = event.status === 'active' ? 'פעיל' : 'סגור';

            // ✅ הצג שם בעל האירוע (רק למנהל על)
            const ownerBadge = authManager.isSuperAdmin() && event.ownerName ?
                `<div class="event-owner-badge">👤 ${event.ownerName}</div>` : '';

            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-header">
                        <h3>${event.name || 'אירוע ללא שם'}</h3>
                        <span class="event-status ${event.status || 'active'}">${statusText}</span>
                    </div>
                    ${ownerBadge}
                    <div class="event-details">
                        <p>📍 ${event.location || 'לא צוין מקום'}</p>
                        <p>📅 ${date}</p>
                        <p>🎮 ${event.stats?.totalPlayers || 0} שחקנים</p>
                        <p>🏆 ${event.stats?.totalWinners || 0} זוכים</p>
                    </div>
                    <div class="event-actions">
                        <button class="btn-primary" onclick="eventsManager.openEvent('${event.id}')">פתח משחק</button>
                        <button class="btn-secondary" onclick="eventsManager.viewScoreboard('${event.id}')">לוח זוכים</button>
                        <button class="btn-secondary" onclick="eventsManager.editEvent('${event.id}')">ערוך</button>
                        ${authManager.hasPermission('canDeleteEvents') ?
                            `<button class="btn-danger" onclick="eventsManager.deleteEvent('${event.id}')">מחק</button>` :
                            ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    // סנן אירועים לפי חיפוש
    filterEvents(query) {
        query = query.toLowerCase().trim();

        if (!query) {
            this.filteredEvents = [...this.events];
        } else {
            this.filteredEvents = this.events.filter(event => {
                const name = (event.name || '').toLowerCase();
                const location = (event.location || '').toLowerCase();
                return name.includes(query) || location.includes(query);
            });
        }

        this.displayEvents();
    },

    // סנן לפי סטטוס
    filterByStatus(status) {
        if (status === 'all') {
            this.filteredEvents = [...this.events];
        } else {
            this.filteredEvents = this.events.filter(event => event.status === status);
        }

        this.displayEvents();
    },

    // הצג מודל יצירת אירוע
    showCreateEventModal() {
        this.currentEventId = null;

        document.getElementById('modal-title').textContent = 'אירוע חדש';
        document.getElementById('event-name').value = '';
        document.getElementById('event-location').value = '';
        document.getElementById('event-date').value = '';
        document.getElementById('event-description').value = '';

        document.getElementById('event-modal').classList.remove('hidden');
    },

    // ערוך אירוע
    async editEvent(eventId) {
        this.currentEventId = eventId;

        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        document.getElementById('modal-title').textContent = 'ערוך אירוע';
        document.getElementById('event-name').value = event.name || '';
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-date').value = event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '';
        document.getElementById('event-description').value = event.description || '';

        document.getElementById('event-modal').classList.remove('hidden');
    },

    // שמור אירוע (יצירה/עריכה)
    async saveEvent() {
        const name = document.getElementById('event-name').value.trim();
        const location = document.getElementById('event-location').value.trim();
        const dateInput = document.getElementById('event-date').value;
        const description = document.getElementById('event-description').value.trim();

        if (!name) {
            alert('❌ נא להזין שם אירוע');
            return;
        }

        const eventDate = dateInput ? new Date(dateInput).getTime() : null;
        const userId = authManager.getCurrentUserId();

        try {
            if (this.currentEventId) {
                // עריכת אירוע קיים
                const eventRef = firebase.database().ref(`events/${this.currentEventId}`);
                await eventRef.update({
                    name,
                    location,
                    eventDate,
                    description,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });

                console.log('✅ אירוע עודכן');
                alert('✅ האירוע עודכן בהצלחה');
            } else {
                // יצירת אירוע חדש
                const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const sessionId = `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const newEvent = {
                    name,
                    location,
                    eventDate,
                    description,
                    ownerId: userId,
                    ownerName: authManager.userProfile.displayName,
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

                console.log('✅ אירוע חדש נוצר:', eventId);
                alert('✅ האירוע נוצר בהצלחה');

                // עדכן סטטיסטיקות משתמש
                const userRef = firebase.database().ref(`users/${userId}/stats`);
                const snapshot = await userRef.once('value');
                const currentStats = snapshot.val() || {};
                await userRef.update({
                    totalEvents: (currentStats.totalEvents || 0) + 1
                });
            }

            this.closeModal();
            await this.loadEvents();
        } catch (error) {
            console.error('❌ שגיאה בשמירת אירוע:', error);
            alert('❌ שגיאה בשמירת האירוע');
        }
    },

    // מחק אירוע
    async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const confirmed = confirm(`❌ האם למחוק את האירוע "${event.name}"?\n\nפעולה זו תמחק גם את כל הזוכים והנתונים!`);
        if (!confirmed) return;

        try {
            await firebase.database().ref(`events/${eventId}`).remove();

            console.log('🗑️ אירוע נמחק:', eventId);
            alert('✅ האירוע נמחק בהצלחה');

            await this.loadEvents();
        } catch (error) {
            console.error('❌ שגיאה במחיקת אירוע:', error);
            alert('❌ שגיאה במחיקת האירוע');
        }
    },

    // פתח משחק
    openEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        // שמור את ה-eventId ב-localStorage
        localStorage.setItem('currentEventId', eventId);
        localStorage.setItem('currentSessionId', event.sessionId);

        // פתח את המשחק
        window.open(`index.html?event=${eventId}`, '_blank');
    },

    // הצג לוח זוכים
    viewScoreboard(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        window.open(`scoreboard.html?session=${event.sessionId}`, '_blank');
    },

    // סגור מודל
    closeModal() {
        document.getElementById('event-modal').classList.add('hidden');
        this.currentEventId = null;
    },

    // הצג מודל משתמשים (מנהל ראשי)
    async showUsersModal() {
        if (!authManager.isSuperAdmin()) {
            alert('❌ אין הרשאה');
            return;
        }

        const modal = document.getElementById('users-modal');
        modal.classList.remove('hidden');

        await this.loadUsers();
    },

    // טען משתמשים
    async loadUsers() {
        const container = document.getElementById('users-container');
        if (!container) return;

        container.innerHTML = '<div class="loading">⏳ טוען משתמשים...</div>';

        try {
            const usersRef = firebase.database().ref('users');
            const snapshot = await usersRef.once('value');

            const users = [];
            snapshot.forEach((childSnapshot) => {
                users.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            if (users.length === 0) {
                container.innerHTML = '<div class="no-events">אין משתמשים</div>';
                return;
            }

            const html = users.map(user => {
                const role = user.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל אירועים';
                const roleClass = user.role === 'super_admin' ? 'admin' : 'manager';

                return `
                    <div class="user-item">
                        <div class="user-item-info">
                            <img src="${user.photoURL || 'https://via.placeholder.com/50'}" alt="${user.displayName}">
                            <div class="user-item-details">
                                <h4>${user.displayName || 'משתמש'}</h4>
                                <p>${user.email}</p>
                                <span class="role-badge ${roleClass}">${role}</span>
                            </div>
                        </div>
                        <div class="user-item-actions">
                            <p style="color: var(--text-secondary); font-size: 0.9em;">
                                📊 ${user.stats?.totalEvents || 0} אירועים |
                                🏆 ${user.stats?.totalWinners || 0} זוכים
                            </p>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
        } catch (error) {
            console.error('❌ שגיאה בטעינת משתמשים:', error);
            container.innerHTML = '<div class="no-events">❌ שגיאה בטעינת משתמשים</div>';
        }
    },

    // סגור מודל משתמשים
    closeUsersModal() {
        document.getElementById('users-modal').classList.add('hidden');
    },

    // טען סטטיסטיקות למנהל ראשי
    async loadAdminStats() {
        if (!authManager.isSuperAdmin()) return;

        try {
            // משתמשים
            const usersSnapshot = await firebase.database().ref('users').once('value');
            const totalUsers = usersSnapshot.numChildren();
            document.getElementById('total-users').textContent = totalUsers;

            // אירועים
            const totalEvents = this.events.length;
            const activeEvents = this.events.filter(e => e.status === 'active').length;
            document.getElementById('total-events').textContent = totalEvents;
            document.getElementById('active-events').textContent = activeEvents;

            // זוכים
            let totalWinners = 0;
            this.events.forEach(event => {
                totalWinners += event.stats?.totalWinners || 0;
            });
            document.getElementById('total-winners').textContent = totalWinners;

            // הצג את סקציית הסטטיסטיקות
            document.getElementById('stats-section').classList.remove('hidden');
        } catch (error) {
            console.error('❌ שגיאה בטעינת סטטיסטיקות:', error);
        }
    }
};

// ייצוא גלובלי
window.eventsManager = eventsManager;
