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

            // ✅ בדיקת כפילויות sessionId
            this.checkDuplicateSessionIds();

            this.filteredEvents = [...this.events];
            this.displayEvents();

            console.log(`✅ נטענו ${this.events.length} אירועים`);
        } catch (error) {
            console.error('❌ שגיאה בטעינת אירועים:', error);
            container.innerHTML = '<div class="no-events">❌ שגיאה בטעינת אירועים</div>';
        }
    },

    // בדיקת כפילויות sessionId ותיקון אוטומטי
    checkDuplicateSessionIds() {
        const sessionIds = {};
        const duplicates = [];

        // מצא כפילויות
        this.events.forEach(event => {
            if (event.sessionId) {
                if (sessionIds[event.sessionId]) {
                    duplicates.push({
                        eventId: event.id,
                        eventName: event.name,
                        sessionId: event.sessionId,
                        originalEvent: sessionIds[event.sessionId]
                    });
                } else {
                    sessionIds[event.sessionId] = {
                        id: event.id,
                        name: event.name
                    };
                }
            }
        });

        // אם נמצאו כפילויות - דווח ותקן
        if (duplicates.length > 0) {
            console.error('🚨 נמצאו אירועים עם sessionId זהה!');
            duplicates.forEach(dup => {
                console.error(`⚠️ כפילות: "${dup.eventName}" (${dup.eventId}) משתף sessionId עם "${dup.originalEvent.name}" (${dup.originalEvent.id})`);
            });

            // הצע תיקון אוטומטי
            if (confirm(
                `⚠️ זוהתה בעיה קריטית!\n\n` +
                `${duplicates.length} אירוע/ים משתפים sessionId זהה.\n` +
                `זה עלול לגרום לבעיות במעקב אחרי שחקנים וזוכים.\n\n` +
                `האם ליצור sessionId חדש ייחודי לכל אירוע?\n\n` +
                `(מומלץ מאוד!)`
            )) {
                this.fixDuplicateSessionIds(duplicates);
            }
        }
    },

    // תקן כפילויות sessionId
    async fixDuplicateSessionIds(duplicates) {
        console.log('🔧 מתקן כפילויות sessionId...');

        try {
            for (const dup of duplicates) {
                // צור sessionId חדש וייחודי
                const newSessionId = `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                console.log(`🔄 מעדכן אירוע "${dup.eventName}" עם sessionId חדש: ${newSessionId}`);

                // עדכן ב-Firebase
                await firebase.database().ref(`events/${dup.eventId}`).update({
                    sessionId: newSessionId
                });

                // המתן קצת בין עדכונים למנוע התנגשויות
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log('✅ כל הכפילויות תוקנו!');
            alert(`✅ ${duplicates.length} אירוע/ים עודכנו בהצלחה עם sessionId ייחודי!`);

            // טען מחדש את האירועים
            await this.loadEvents();
        } catch (error) {
            console.error('❌ שגיאה בתיקון כפילויות:', error);
            alert('❌ שגיאה בתיקון. נסה שוב או צור קשר עם התמיכה.');
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

            // ✅ הצג שם בעל האירוע - כולם רואים, רק מנהל על יכול להחליף
            const ownerBadge = event.ownerName ?
                `<div class="event-owner-badge ${authManager.isSuperAdmin() ? 'clickable' : ''}"
                      ${authManager.isSuperAdmin() ? `onclick="eventsManager.showTransferOwnershipModal('${event.id}')" title="לחץ להחלפת בעלים"` : ''}>
                    👤 ${event.ownerName}
                    ${authManager.isSuperAdmin() ? '<span class="change-icon">🔄</span>' : ''}
                </div>` : '';

            return `
                <div class="event-card" data-event-id="${event.id}" onclick="eventsManager.handleCardClick(event, '${event.id}')" style="cursor: pointer;">
                    <div class="event-header">
                        <h3>${event.name || 'אירוע ללא שם'}</h3>
                        <span class="session-status-badge" id="session-status-${event.id}">
                            <span class="status-indicator"></span>
                            <span class="status-text">בודק...</span>
                        </span>
                    </div>
                    ${ownerBadge}
                    <div class="event-details">
                        <p>📍 ${event.location || 'לא צוין מקום'}</p>
                        <p>📅 ${date}</p>
                        <p>🔑 Session: <code style="font-size: 0.85em; background: rgba(255,215,0,0.1); padding: 2px 6px; border-radius: 4px;">${event.sessionId || 'אין'}</code></p>
                        <p>🎮 ${event.stats?.totalPlayers || 0} שחקנים</p>
                        <p>🏆 ${event.stats?.totalWinners || 0} זוכים</p>
                        <p class="session-time" id="session-time-${event.id}"></p>
                    </div>
                    <div class="event-actions" onclick="event.stopPropagation()">
                        <button class="btn-primary" onclick="eventsManager.openEvent('${event.id}')">פתח משחק</button>
                        <button class="btn-secondary" onclick="eventsManager.viewScoreboard('${event.id}')">לוח זוכים</button>
                        <button class="btn-danger" onclick="eventsManager.deleteEvent('${event.id}')" title="מחק אירוע זה לצמיתות">🗑️ מחק</button>
                        ${authManager.isSuperAdmin() ?
                            `<button class="btn-warning" onclick="eventsManager.showTransferOwnershipModal('${event.id}')" title="העבר בעלות למשתמש אחר">🔄 העבר בעלות</button>` :
                            ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // ✅ עדכן סטטוס session לכל אירוע
        this.filteredEvents.forEach(event => {
            if (event.sessionId) {
                this.updateSessionStatus(event.id, event.sessionId);
            }
        });
    },

    // עדכן סטטוס session בזמן אמת
    async updateSessionStatus(eventId, sessionId) {
        try {
            const sessionRef = firebase.database().ref(`sessions/${sessionId}`);

            // האזן לשינויים בזמן אמת
            sessionRef.on('value', (snapshot) => {
                const sessionData = snapshot.val();
                const statusBadge = document.getElementById(`session-status-${eventId}`);
                const sessionTime = document.getElementById(`session-time-${eventId}`);

                if (!statusBadge || !sessionTime) return;

                if (sessionData && sessionData.sessionActive) {
                    // Session פעיל
                    statusBadge.innerHTML = `
                        <span class="status-indicator active"></span>
                        <span class="status-text">פעיל</span>
                    `;
                    statusBadge.className = 'session-status-badge active clickable';
                    statusBadge.style.cursor = 'pointer';
                    statusBadge.title = 'לחץ לניתוק Session';

                    // ✅ הוסף click handler לניתוק session
                    statusBadge.onclick = async () => {
                        const confirmDisconnect = confirm('❓ האם אתה בטוח שברצונך לנתק את ה-session?\n\nכל הטאבים הפתוחים יוחזרו למשחק הרגיל.');

                        if (confirmDisconnect) {
                            try {
                                // סגור את ה-session
                                await firebase.database().ref(`sessions/${sessionId}`).update({
                                    sessionActive: false,
                                    closedAt: firebase.database.ServerValue.TIMESTAMP,
                                    closedReason: 'manual_disconnect'
                                });

                                console.log('✅ Session נותק בהצלחה:', sessionId);
                                alert('✅ Session נותק בהצלחה!');
                            } catch (error) {
                                console.error('❌ שגיאה בניתוק session:', error);
                                alert('❌ שגיאה בניתוק session. נסה שוב.');
                            }
                        }
                    };

                    // הצג מתי נפתח
                    if (sessionData.openedAt) {
                        const openedDate = new Date(sessionData.openedAt);
                        const timeStr = openedDate.toLocaleString('he-IL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        sessionTime.innerHTML = `🟢 נפתח ב: ${timeStr}`;
                        sessionTime.style.color = '#4ade80';
                    }
                } else if (sessionData && sessionData.closedAt) {
                    // Session סגור
                    statusBadge.innerHTML = `
                        <span class="status-indicator closed"></span>
                        <span class="status-text">סגור</span>
                    `;
                    statusBadge.className = 'session-status-badge closed';

                    // הצג מתי נסגר
                    const closedDate = new Date(sessionData.closedAt);
                    const timeStr = closedDate.toLocaleString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    sessionTime.innerHTML = `🔴 נסגר ב: ${timeStr}`;
                    sessionTime.style.color = '#ef4444';
                } else {
                    // אין נתונים - Session חדש שטרם נפתח
                    statusBadge.innerHTML = `
                        <span class="status-indicator ready"></span>
                        <span class="status-text">מוכן</span>
                    `;
                    statusBadge.className = 'session-status-badge ready';
                    sessionTime.innerHTML = '⚪ טרם נפתח';
                    sessionTime.style.color = '#9ca3af';
                }
            });
        } catch (error) {
            console.error('❌ שגיאה בעדכון סטטוס session:', error);
        }
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

    // סנן לפי בעלות (למנהל על בלבד)
    filterByOwner(ownerFilter) {
        if (!authManager.isSuperAdmin()) return;

        const currentUserId = authManager.getCurrentUserId();

        if (ownerFilter === 'all') {
            this.filteredEvents = [...this.events];
        } else if (ownerFilter === 'mine') {
            this.filteredEvents = this.events.filter(event => event.ownerId === currentUserId);
        }

        this.displayEvents();
    },

    // טיפול בלחיצה על כרטיס אירוע - פתיחת עריכה
    handleCardClick(clickEvent, eventId) {
        // בדוק אם הלחיצה הייתה על כפתור או אלמנט אינטראקטיבי
        const target = clickEvent.target;

        // אל תפתח עריכה אם לחצו על כפתור, קישור או אלמנט אינטראקטיבי אחר
        if (target.closest('button') ||
            target.closest('a') ||
            target.closest('.session-status-badge') ||
            target.closest('.event-owner-badge.clickable')) {
            return;
        }

        // פתח עריכת האירוע
        this.editEvent(eventId);
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

    // מחק אירוע - פתיחת modal אישור
    deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        // שמור את ה-eventId למחיקה
        this.deleteEventId = eventId;

        // עדכן שם האירוע במודל
        document.getElementById('delete-event-name').textContent = event.name || 'ללא שם';

        // נקה את שדה האישור
        document.getElementById('delete-confirmation-input').value = '';

        // פתח את המודל
        document.getElementById('delete-event-modal').classList.remove('hidden');

        // Focus על שדה הקלט
        setTimeout(() => {
            document.getElementById('delete-confirmation-input').focus();
        }, 100);
    },

    // סגור modal מחיקה
    closeDeleteModal() {
        document.getElementById('delete-event-modal').classList.add('hidden');
        this.deleteEventId = null;
        document.getElementById('delete-confirmation-input').value = '';
    },

    // אשר מחיקה
    async confirmDelete() {
        const userInput = document.getElementById('delete-confirmation-input').value;

        // בדוק אם המשתמש הקליד "מחיקה"
        if (userInput !== 'מחיקה') {
            alert('❌ נא להקליד "מחיקה" בדיוק כדי לאשר את המחיקה.');
            document.getElementById('delete-confirmation-input').focus();
            return;
        }

        const eventId = this.deleteEventId;
        const event = this.events.find(e => e.id === eventId);

        if (!event) {
            alert('❌ אירוע לא נמצא');
            this.closeDeleteModal();
            return;
        }

        try {
            console.log('🗑️ מתחיל מחיקה מלאה של אירוע:', eventId);

            // 1. מחק את ה-Session המקושר (אם קיים)
            if (event.sessionId) {
                console.log('🗑️ מוחק session:', event.sessionId);
                await firebase.database().ref(`sessions/${event.sessionId}`).remove();
                console.log('✅ Session נמחק');
            }

            // 2. מחק את האירוע עצמו (כולל הזוכים, השחקנים, המלאי וההגדרות)
            console.log('🗑️ מוחק אירוע:', eventId);
            await firebase.database().ref(`events/${eventId}`).remove();
            console.log('✅ אירוע נמחק');

            // 3. עדכן סטטיסטיקות משתמש (הפחת מספר אירועים)
            const ownerId = event.ownerId;
            if (ownerId) {
                const userStatsRef = firebase.database().ref(`users/${ownerId}/stats`);
                const statsSnapshot = await userStatsRef.once('value');
                const currentStats = statsSnapshot.val() || { totalEvents: 0 };

                const newTotalEvents = Math.max(0, (currentStats.totalEvents || 0) - 1);

                await userStatsRef.update({
                    totalEvents: newTotalEvents
                });
                console.log('✅ סטטיסטיקות משתמש עודכנו');
            }

            console.log('✅ מחיקה מלאה הושלמה בהצלחה');

            // סגור את המודל
            this.closeDeleteModal();

            alert(`✅ האירוע "${event.name}" נמחק בהצלחה!\n\nכל הנתונים המקושרים נמחקו לצמיתות.`);

            // טען מחדש את רשימת האירועים
            await this.loadEvents();
        } catch (error) {
            console.error('❌ שגיאה במחיקת אירוע:', error);
            this.closeDeleteModal();
            alert('❌ שגיאה במחיקת האירוע. נסה שוב או פנה לתמיכה.');
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
    },

    // ✅ NEW: Transfer Event Ownership (Super Admin Only)
    transferEventId: null,
    allUsers: [],

    // הצג מודל העברת בעלות
    async showTransferOwnershipModal(eventId) {
        if (!authManager.isSuperAdmin()) {
            alert('❌ אין הרשאה');
            return;
        }

        this.transferEventId = eventId;
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        // עדכן פרטי אירוע
        document.getElementById('transfer-event-name').textContent = event.name || 'ללא שם';
        document.getElementById('transfer-current-owner').textContent = event.ownerName || 'לא ידוע';

        // טען רשימת משתמשים
        await this.loadUsersForTransfer();

        // הצג מודל
        document.getElementById('transfer-ownership-modal').classList.remove('hidden');
    },

    // טען משתמשים לרשימת העברה
    async loadUsersForTransfer() {
        const select = document.getElementById('transfer-new-owner');
        select.innerHTML = '<option value="">טוען...</option>';

        try {
            const usersRef = firebase.database().ref('users');
            const snapshot = await usersRef.once('value');

            this.allUsers = [];
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                this.allUsers.push({
                    uid: childSnapshot.key,
                    displayName: user.displayName || user.email,
                    email: user.email,
                    role: user.role
                });
            });

            // מיין לפי שם
            this.allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'he'));

            // בנה רשימה
            this.renderTransferUsersList();
        } catch (error) {
            console.error('❌ שגיאה בטעינת משתמשים:', error);
            select.innerHTML = '<option value="">❌ שגיאה בטעינה</option>';
        }
    },

    // סנן משתמשים לפי חיפוש
    filterTransferUsers(searchTerm) {
        this.renderTransferUsersList(searchTerm);
    },

    // הצג רשימת משתמשים מסוננת
    renderTransferUsersList(searchTerm = '') {
        const select = document.getElementById('transfer-new-owner');
        const search = searchTerm.toLowerCase().trim();

        // סנן משתמשים
        const filteredUsers = search
            ? this.allUsers.filter(user =>
                user.displayName.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            )
            : this.allUsers;

        // בנה HTML
        let html = '<option value="">-- בחר משתמש --</option>';
        filteredUsers.forEach(user => {
            const roleText = user.role === 'super_admin' ? '👑 מנהל על' : '🎬 מפיק';
            html += `<option value="${user.uid}">${user.displayName} (${user.email}) - ${roleText}</option>`;
        });

        // אם אין תוצאות
        if (filteredUsers.length === 0 && search) {
            html += '<option value="" disabled>❌ לא נמצאו משתמשים</option>';
        }

        select.innerHTML = html;

        console.log(`🔍 נמצאו ${filteredUsers.length} משתמשים עבור "${searchTerm}"`);
    },

    // אשר העברת בעלות
    async confirmTransferOwnership() {
        const newOwnerId = document.getElementById('transfer-new-owner').value;

        if (!newOwnerId) {
            alert('❌ נא לבחור משתמש');
            return;
        }

        const event = this.events.find(e => e.id === this.transferEventId);
        if (!event) {
            alert('❌ אירוע לא נמצא');
            return;
        }

        const newOwner = this.allUsers.find(u => u.uid === newOwnerId);
        if (!newOwner) {
            alert('❌ משתמש לא נמצא');
            return;
        }

        const confirmed = confirm(
            `האם להעביר את הבעלות על:\n\n` +
            `"${event.name}"\n\n` +
            `מ: ${event.ownerName}\n` +
            `אל: ${newOwner.displayName}?`
        );

        if (!confirmed) return;

        try {
            // עדכן בעלות ב-Firebase
            const eventRef = firebase.database().ref(`events/${this.transferEventId}`);
            await eventRef.update({
                ownerId: newOwnerId,
                ownerName: newOwner.displayName,
                transferredAt: firebase.database.ServerValue.TIMESTAMP,
                transferredBy: authManager.getCurrentUserId()
            });

            console.log('✅ בעלות הועברה בהצלחה');
            alert(`✅ האירוע "${event.name}" הועבר ל-${newOwner.displayName}`);

            // סגור מודל ורענן
            this.closeTransferOwnershipModal();
            await this.loadEvents();
        } catch (error) {
            console.error('❌ שגיאה בהעברת בעלות:', error);
            alert('❌ שגיאה בהעברת בעלות');
        }
    },

    // סגור מודל העברת בעלות
    closeTransferOwnershipModal() {
        document.getElementById('transfer-ownership-modal').classList.add('hidden');
        this.transferEventId = null;
    }
};

// ייצוא גלובלי
window.eventsManager = eventsManager;
