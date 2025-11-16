// Session Manager for Main Screen
// Manages QR code display, player info, and Firebase integration

class SessionManager {
  constructor() {
    this.sessionId = null;
    this.currentSession = null;
    this.currentPlayer = null;
    this.unsubscribeSession = null;
    this.unsubscribeActions = null;
    this.playerTimeout = null;
    this.timerInterval = null;
    this.timeLeft = 0;
    this.maxWaitTime = 30; // 30 seconds to press button
    this.isSpinActive = false; // למנוע לחיצות כפולות בזמן spin
  }

  // Initialize session manager
  async init() {
    console.log('🚀 Initializing Session Manager...');

    // Check if remote control is enabled (maxAttempts > 0)
    const maxAttempts = parseInt(localStorage.getItem('maxPlayerAttempts')) || 3;
    if (maxAttempts === 0) {
      console.log('🎮 Remote control disabled (maxAttempts = 0)');
      return false;
    }

    // Initialize Firebase
    const db = initFirebase();
    if (!db) {
      console.error('❌ Failed to initialize Firebase');
      return false;
    }

    // Clean up old sessions
    await cleanupOldSessions();

    // Get or create session ID
    this.sessionId = getSessionId();
    console.log('📱 Session ID:', this.sessionId);

    // ✅ צור session ב-Firebase רק אם יש אירוע פעיל (eventId ב-URL)
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    if (eventId) {
      console.log('🎯 יש אירוע פעיל - יוצר session:', eventId);
      await createSession(this.sessionId, 3, maxAttempts);
    } else {
      console.log('⚠️ אין אירוע פעיל - לא יוצר session חדש');
      console.log('💤 משחק במצב דיפולטי (ללא שליטה מרחוק)');
      return false;
    }

    // ✅ רק אם יש אירוע פעיל - טען הגדרות והצג QR
    if (eventId) {
      // נסה לטעון פרסים מ-Firebase (שחזור אוטומטי!)
      if (window.dynamicImagesManager) {
        const loaded = await dynamicImagesManager.loadFromFirebase(this.sessionId);
        if (loaded) {
          console.log('☁️ פרסים נטענו מ-Firebase בהצלחה');
          // עדכן את הגלגלים אם צריך
          if (typeof applyDynamicImages === 'function') {
            applyDynamicImages();
          }
        }
      }

      // Generate QR code
      this.generateQRCode();

      // Start listening to session changes
      this.startListening();

      // Add click handler to skip current player
      this.setupPlayerInfoClickHandler();

      // ✅ עדכן את הפס הנגלל עם זוכים (אחרי שיש sessionId)
      if (typeof updateScrollingBanner === 'function') {
        updateScrollingBanner();
        console.log('📜 פס גלילה עודכן עם sessionId');
      }

      // ✅ טען הגדרות משחק מ-Firebase (אם קיימות)
      this.loadGameSettingsFromFirebase();
    }

    return true;
  }

  // טען הגדרות משחק מ-Firebase
  async loadGameSettingsFromFirebase() {
    try {
      const snapshot = await firebase.database().ref(`sessions/${this.sessionId}/gameSettings`).once('value');
      const settings = snapshot.val();

      if (settings) {
        console.log('☁️ טוען הגדרות משחק מ-Firebase:', settings);

        // עדכן את gameState רק אם יש הגדרות ב-Firebase
        if (typeof window.gameState !== 'undefined') {
          if (settings.winFrequency !== undefined) gameState.winFrequency = settings.winFrequency;
          if (settings.randomBonusPercent !== undefined) gameState.randomBonusPercent = settings.randomBonusPercent;
          if (settings.soundEnabled !== undefined) gameState.soundEnabled = settings.soundEnabled;
          if (settings.gameMode !== undefined) gameState.mode = settings.gameMode;
          if (settings.backgroundColor) gameState.backgroundColor = settings.backgroundColor;
          if (settings.whatsappNumber) gameState.whatsappNumber = settings.whatsappNumber;
          if (settings.simpleWinScreen !== undefined) gameState.simpleWinScreen = settings.simpleWinScreen;
          if (settings.qrCustomText) gameState.qrCustomText = settings.qrCustomText;
          // ✅ תיקון: קבל גם טקסט ריק ('' = המשתמש מחק את הטקסט)
          if (settings.scrollingBannerText !== undefined) gameState.scrollingBannerText = settings.scrollingBannerText;
          if (settings.scrollingBannerFontSize) gameState.scrollingBannerFontSize = settings.scrollingBannerFontSize;

          console.log('✅ הגדרות משחק עודכנו מ-Firebase');
        }
      } else {
        console.log('📭 אין הגדרות שמורות ב-Firebase - משתמש בהגדרות localStorage');
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת הגדרות מ-Firebase:', error);
    }
  }

  // Setup click handler for player info area
  setupPlayerInfoClickHandler() {
    const playerInfo = document.getElementById('player-info');
    if (playerInfo) {
      playerInfo.style.cursor = 'pointer';
      playerInfo.addEventListener('click', async () => {
        if (this.currentPlayer && this.currentPlayer.id) {
          console.log('⏭️ Skipping current player:', this.currentPlayer.id);

          // Stop timer
          this.stopPlayerTimer();

          // Remove current player
          await removePlayer(this.sessionId, this.currentPlayer.id);

          // Move to next player
          await getNextPlayer(this.sessionId);
        }
      });
    }
  }

  // Generate QR code with session URL
  generateQRCode() {
    const qrContainer = document.getElementById('qr-display');
    if (!qrContainer) {
      console.error('❌ QR container not found');
      return;
    }

    // Clear previous content and show loader (but keep the text)
    qrContainer.innerHTML = '';

    // Create and show loading spinner
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'qr-loader';
    loaderDiv.innerHTML = '<div class="qr-spinner"></div>';
    qrContainer.appendChild(loaderDiv);

    // Create QR code URL
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const controllerUrl = `${baseUrl}controller.html?session=${this.sessionId}`;

    console.log('🔗 Controller URL:', controllerUrl);

    // Generate QR code using qrcode.js library (after a brief delay to show loader)
    setTimeout(() => {
      const qrCodeDiv = document.createElement('div');
      qrCodeDiv.id = 'qr-code-image';

      new QRCode(qrCodeDiv, {
        text: controllerUrl,
        width: 124,
        height: 124,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      // Replace loader with QR code and add text below
      qrContainer.innerHTML = '';
      qrContainer.appendChild(qrCodeDiv);

      // Add the scan text below the QR code
      const scanText = document.createElement('p');
      scanText.className = 'qr-scan-text';
      scanText.textContent = 'סרקו להפעלה';
      qrContainer.appendChild(scanText);
    }, 100); // Small delay to ensure smooth transition
  }

  // Start listening to Firebase changes
  startListening() {
    // Listen to session changes
    this.unsubscribeSession = listenToSession(this.sessionId, (session) => {
      this.currentSession = session;
      this.updateUI();
    });

    // Listen to player actions
    this.unsubscribeActions = listenToPlayerActions(this.sessionId, (playerId, player) => {
      this.handlePlayerAction(playerId, player);
    });
  }

  // Update UI based on session state
  updateUI() {
    if (!this.currentSession) return;

    // ✅ בדוק אם ה-session נסגר מרחוק
    if (this.currentSession.sessionActive === false) {
      console.warn('🚨 Session נסגר מרחוק! מעביר למשחק דיפולטי...');

      // הצג הודעה למשתמש
      alert('⚠️ Session זה נסגר מרחוק.\n\nמעביר אותך למשחק...');

      // נקה את ה-URL ונקה localStorage
      window.history.replaceState({}, '', window.location.pathname);
      localStorage.removeItem('currentEventId');

      // ✅ במקום reload - פשוט נקה את ה-URL ונשאר בדף
      // זה ימנע יצירת session חדש כי אין eventId ב-URL
      window.location.href = window.location.pathname;
      return;
    }

    const qrContainer = document.getElementById('qr-container');
    const qrDisplay = document.getElementById('qr-display');
    const playerInfo = document.getElementById('player-info');

    if (!qrContainer || !qrDisplay || !playerInfo) return;

    // בדוק אם השליטה מרחוק מופעלת
    const isRemoteControlEnabled = localStorage.getItem('remoteControlEnabled') !== 'false';

    const players = this.currentSession.players || {};
    const currentPlayerId = this.currentSession.currentPlayer;

    if (currentPlayerId && players[currentPlayerId]) {
      const player = players[currentPlayerId];

      // Show player info instead of QR
      this.currentPlayer = { id: currentPlayerId, ...player };
      qrDisplay.style.display = 'none';
      playerInfo.style.display = 'block';

      this.updatePlayerInfo();

      // טיימר - רץ תמיד! רק מתאפס כשהשחקן לוחץ
      // עוצר רק כשהשחקן מנותק (finished/timeout)
      if (player.status === 'finished' || player.status === 'timeout') {
        // רק כאן עוצרים את הטיימר
        this.stopPlayerTimer();
        console.log('⏹️ טיימר נעצר - שחקן מנותק');
      } else {
        // בכל מצב אחר (active, spinning, showing_result) - הטיימר רץ
        if (!this.timerInterval) {
          this.startPlayerTimer();
          console.log('⏰ טיימר הופעל - סטטוס:', player.status);
        }
        // אם הטיימר כבר רץ - פשוט תן לו להמשיך
      }
    } else {
      // Show QR code only if remote control is enabled
      this.currentPlayer = null;

      if (isRemoteControlEnabled) {
        qrDisplay.style.display = 'block';
        playerInfo.style.display = 'none';
      } else {
        // אם השליטה מרחוק כבויה, הסתר הכל
        qrDisplay.style.display = 'none';
        playerInfo.style.display = 'none';
      }

      this.stopPlayerTimer();
    }

    // Update waiting queue
    this.updateWaitingQueue();
  }

  // Update player info display
  updatePlayerInfo() {
    if (!this.currentPlayer) return;

    const playerName = document.getElementById('player-name');
    const playerTimer = document.getElementById('player-timer');
    const playerAttempts = document.getElementById('player-attempts');

    if (playerName) {
      playerName.textContent = this.currentPlayer.name;
    }

    if (playerAttempts) {
      const attemptsLeft = this.currentPlayer.attemptsLeft !== undefined ? this.currentPlayer.attemptsLeft : 0;
      playerAttempts.textContent = `נסיונות שנותרו: ${attemptsLeft}`;
    }
  }

  // Start countdown timer for player
  startPlayerTimer() {
    this.stopPlayerTimer(); // Clear any existing timer

    this.timeLeft = this.maxWaitTime;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;

      const playerTimer = document.getElementById('player-timer');
      const timerProgress = document.getElementById('timer-progress');

      if (playerTimer) {
        playerTimer.textContent = this.timeLeft;
      }

      if (timerProgress) {
        const percentage = (this.timeLeft / this.maxWaitTime) * 100;
        timerProgress.style.width = percentage + '%';

        // Change color based on time left
        if (this.timeLeft <= 3) {
          timerProgress.style.backgroundColor = '#ff4444'; // Red
        } else if (this.timeLeft <= 6) {
          timerProgress.style.backgroundColor = '#ffaa00'; // Orange
        } else {
          timerProgress.style.backgroundColor = '#44ff44'; // Green
        }
      }

      // Time's up!
      if (this.timeLeft <= 0) {
        this.handlePlayerTimeout();
      }
    }, 1000);
  }

  // Stop countdown timer
  stopPlayerTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.playerTimeout) {
      clearTimeout(this.playerTimeout);
      this.playerTimeout = null;
    }
  }

  // Restart timer after spin completes (win or loss)
  async restartPlayerTimer() {
    console.log('🔄 Restarting player timer after spin completion');

    // בדוק אם יש שחקן נוכחי
    if (!this.currentPlayer || !this.currentPlayer.id) {
      console.log('⚠️ No current player - timer not restarted');
      return;
    }

    // קרא את נתוני השחקן העדכניים מ-Firebase
    try {
      const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${this.currentPlayer.id}`);
      const snapshot = await playerRef.once('value');
      const player = snapshot.val();

      if (!player) {
        console.log('⚠️ Player not found - timer not restarted');
        return;
      }

      // אם השחקן סיים או בסטטוס אחר - אל תאתחל טיימר
      if (player.status !== 'active') {
        console.log(`⚠️ Player status is ${player.status} - timer not restarted`);
        return;
      }

      // אם נגמרו לו הנסיונות - אל תאתחל טיימר
      if (!player.attemptsLeft || player.attemptsLeft <= 0) {
        console.log('⚠️ Player has no attempts left - timer not restarted');
        return;
      }

      // אם הטיימר כבר רץ - אל תאתחל מחדש
      if (this.timerInterval) {
        console.log('⏳ Timer already running - no restart needed');
        return;
      }

      // כל התנאים מתקיימים - אתחל את הטיימר
      this.startPlayerTimer();
      console.log(`✅ Timer restarted for ${player.name} (${player.attemptsLeft} attempts left)`);
    } catch (error) {
      console.error('❌ Error restarting timer:', error);
    }
  }

  // Handle player timeout (didn't press button in time)
  async handlePlayerTimeout() {
    console.log('⏰ Player timeout:', this.currentPlayer?.id);

    this.stopPlayerTimer();

    // נקה את currentSpinPlayerId כשהשחקן מתנתק
    this.currentSpinPlayerId = null;
    console.log('🔄 currentSpinPlayerId נוקה בעקבות timeout');

    if (this.currentPlayer) {
      // Update player status to disconnected
      await updatePlayerStatus(this.sessionId, this.currentPlayer.id, 'timeout');

      // Remove player after a moment
      setTimeout(async () => {
        await removePlayer(this.sessionId, this.currentPlayer.id);

        // Move to next player
        await getNextPlayer(this.sessionId);
      }, 1000);
    }
  }

  // Handle player action (button press)
  async handlePlayerAction(playerId, player) {
    console.log('🎮 Player action received from mobile:', playerId, player);

    // טיפול בלחיצת "המשך" אחרי תוצאה
    if (player.lastAction === 'continue') {
      console.log('▶️ Continue action detected - handling...');
      await this.handleContinueAfterResult(playerId);
      return;
    }

    if (player.lastAction === 'buzz') {
      // בדוק אם כבר יש spin פעיל - התעלם מלחיצות כפולות
      if (this.isSpinActive) {
        console.log('⏳ Spin already active - ignoring duplicate action');
        return;
      }

      // בדוק אם השחקן במצב active בלבד
      if (player.status !== 'active') {
        console.log(`⛔ Player status is "${player.status}" - only "active" can spin`);
        return;
      }

      // בדוק אם נותרו נסיונות
      if (!player.attemptsLeft || player.attemptsLeft <= 0) {
        console.log('⛔ Player has no attempts left - ignoring action');
        return;
      }

      console.log('🎯 Pull bar action detected! Triggering spin...');

      // ⏰ אפס את הטיימר (התחל מחדש מ-30 שניות)
      this.timeLeft = this.maxWaitTime;
      console.log('🔄 טיימר אופס לשחקן');

      // נעל spin עד שהוא מסתיים
      this.isSpinActive = true;

      // עדכן סטטוס ל-spinning והפחת נסיון
      const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${playerId}`);
      await playerRef.update({
        status: 'spinning',
        lastAction: null,  // נקה את הפעולה
        attemptsLeft: player.attemptsLeft - 1  // הפחת נסיון
      });

      console.log('🎰 Spinning started - טיימר ממשיך לרוץ');

      // Play spin sound on main screen
      if (typeof playSound === 'function') {
        playSound('spin');
      }

      // Store reference to check result later
      this.currentSpinPlayerId = playerId;

      // Trigger spin - always trigger for remote players
      if (typeof triggerSpin === 'function') {
        console.log('🎰 Calling triggerSpin() for remote player');
        triggerSpin(true); // Pass true to indicate this is from a remote player
      } else {
        console.log('❌ triggerSpin function not available');
      }

      // ⚠️ הסיבוב הסתיים - storeSpinResult תשנה את הסטטוס ל-showing_result
      // ⚠️ לא משחררים את isSpinActive כאן - רק כשלוחצים "המשך"
    }
  }

  // Store spin result for current player
  async storeSpinResult(isWin, prizeDetails = null) {
    try {
      // אם יש שחקן מרחוק - עדכן את פרטיו
      if (this.currentSpinPlayerId) {
        const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${this.currentSpinPlayerId}`);

        // קבל את הנתונים העדכניים כדי לבדוק נסיונות
        const snapshot = await playerRef.once('value');
        const player = snapshot.val();

        if (!player) {
          console.error('❌ Player not found when storing result');
          return;
        }

        const updateData = {
          status: 'showing_result',  // ✅ שנה ל-showing_result
          lastResult: isWin ? 'win' : 'loss',
          lastResultTime: firebase.database.ServerValue.TIMESTAMP,
          attemptsLeft: player.attemptsLeft  // שמור את הנסיונות הנוכחיים
        };

        // הוסף פרטי פרס אם זכייה
        if (isWin && prizeDetails) {
          const prizeData = {
            prizeName: prizeDetails.prizeName || 'לא זוהה',
            symbolIndex: prizeDetails.symbolIndex,
            symbolDisplay: prizeDetails.symbolDisplay
          };

          // הוסף remainingInventory רק אם הוא מוגדר (לא undefined)
          if (prizeDetails.remainingInventory !== undefined && prizeDetails.remainingInventory !== null) {
            prizeData.remainingInventory = prizeDetails.remainingInventory;
          }

          updateData.prizeDetails = prizeData;
          console.log(`📊 Stored WIN with prize details:`, updateData.prizeDetails);
        } else {
          console.log(`📊 Stored ${isWin ? 'WIN' : 'LOSS'} result for player:`, this.currentSpinPlayerId);
        }

        await playerRef.update(updateData);
        console.log(`✅ Player status changed to "showing_result" (${player.attemptsLeft} attempts left)`);
      }

      // אם זכייה - שמור ברשימת זוכים (גם אם אין שחקן מרחוק!)
      if (isWin) {
        await this.saveWinnerToScoreboard(prizeDetails);
      }

    } catch (error) {
      console.error('❌ Error storing spin result:', error);
    }
  }

  // Save winner to global scoreboard
  async saveWinnerToScoreboard(prizeDetails) {
    try {
      // קבל את פרטי השחקן (אם יש)
      let playerName = 'לחץ בבאזר';
      let playerId = null;

      if (this.currentSpinPlayerId) {
        const playerSnapshot = await firebase.database()
          .ref(`sessions/${this.sessionId}/players/${this.currentSpinPlayerId}`)
          .once('value');

        const player = playerSnapshot.val();
        if (player) {
          playerName = player.name;
          playerId = this.currentSpinPlayerId;
        }
      }

      // קבל את קוד הפרס מהמערכת
      let prizeCode = null;
      let prizeName = prizeDetails?.prizeName || 'פרס';
      let prizeSymbol = prizeDetails?.symbolDisplay || '🎁';

      // אם יש dynamicImagesManager וסמל אינדקס - קבל את הקוד
      if (window.dynamicImagesManager && prizeDetails?.symbolIndex !== undefined) {
        const prize = dynamicImagesManager.images[prizeDetails.symbolIndex];
        if (prize) {
          prizeCode = prize.code; // ✅ PRIZE_001, PRIZE_002...
          // ✅ השתמש ב-prizeName מותאם אישית אם קיים, אחרת label, אחרת ברירת מחדל
          if (prize.prizeName && prize.prizeName.trim()) {
            prizeName = prize.prizeName.trim();
          } else if (prize.label) {
            prizeName = prize.label;
          }
          console.log(`🎫 קוד פרס: ${prizeCode}, שם: ${prizeName}`);
        }
      }

      // צור רשומת זוכה
      const winnerEntry = {
        playerName: playerName,
        prizeCode: prizeCode,           // ✅ קוד ייחודי לפרס
        prizeName: prizeName,            // שם לתצוגה
        prizeSymbol: prizeSymbol,        // סמל לתצוגה
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        sessionId: this.sessionId,
        playerId: playerId,              // null אם שחקן אנונימי

        // לעתיד - פדיון
        redemptionCode: null,  // יווצר כשנוסיף מערכת פדיון
        redeemed: false,
        redeemedAt: null,
        redeemedBy: null
      };

      // שמור ברשימת זוכים של הסשן הספציפי
      const winnersRef = firebase.database().ref(`sessions/${this.sessionId}/winners`);
      await winnersRef.push(winnerEntry);

      console.log('🏆 Winner saved to session scoreboard:', winnerEntry);

      // עדכן את הפס הגלילה עם הזוכה החדש
      if (typeof updateScrollingBanner === 'function') {
        updateScrollingBanner();
        console.log('📜 פס גלילה עודכן עם זוכה חדש');
      }
    } catch (error) {
      console.error('❌ Error saving winner to scoreboard:', error);
    }
  }

  // Handle "Continue" button click after showing result
  async handleContinueAfterResult(playerId) {
    console.log('▶️ handleContinueAfterResult called for player:', playerId);

    try {
      const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${playerId}`);
      const snapshot = await playerRef.once('value');
      const player = snapshot.val();

      if (!player) {
        console.error('❌ Player not found when continuing');
        return;
      }

      console.log(`📊 Player has ${player.attemptsLeft} attempts left`);

      // בדוק אם נותרו נסיונות
      if (player.attemptsLeft > 0) {
        // יש עוד נסיונות - חזור ל-active
        console.log('↩️ Player has attempts left - returning to active');

        await playerRef.update({
          status: 'active',
          lastResult: null,
          prizeDetails: null
        });

        // הטיימר ימשיך לרוץ אוטומטית (לא צריך restart)
        console.log('⏰ Player back to active - טיימר ממשיך לרוץ');

        // שחרר את הנעילה
        this.isSpinActive = false;
        console.log('🔓 Spin lock released - player can spin again');

      } else {
        // אין עוד נסיונות - סיים את השחקן
        console.log('🔚 No attempts left - finishing player');

        await playerRef.update({
          status: 'finished'
        });

        // שחרר נעילה
        this.isSpinActive = false;

        // הסר את השחקן ועבור לבא
        setTimeout(async () => {
          await removePlayer(this.sessionId, playerId);
          await getNextPlayer(this.sessionId);
          this.currentSpinPlayerId = null;
          console.log('✅ Player removed, next player selected');
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error in handleContinueAfterResult:', error);
    }
  }

  // Get controller URL for sharing
  getControllerUrl() {
    if (!this.sessionId) {
      console.error('❌ No session ID available');
      return null;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const controllerUrl = `${baseUrl}controller.html?session=${this.sessionId}`;
    return controllerUrl;
  }

  // Update waiting queue display
  updateWaitingQueue() {
    const queueContainer = document.getElementById('waiting-queue');
    if (!queueContainer) return;

    if (!this.currentSession || !this.currentSession.players) {
      queueContainer.innerHTML = '';
      return;
    }

    const players = Object.entries(this.currentSession.players);
    const waitingPlayers = players.filter(([id, player]) =>
      player.status === 'waiting'
    );

    if (waitingPlayers.length === 0) {
      queueContainer.innerHTML = '';
      return;
    }

    queueContainer.innerHTML = '<div class="queue-title">בתור:</div>';

    waitingPlayers.forEach(([id, player], index) => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'queue-player';
      playerDiv.textContent = `${index + 1}. ${player.name}`;
      queueContainer.appendChild(playerDiv);
    });
  }

  // Clean up listeners
  destroy() {
    if (this.unsubscribeSession) {
      this.unsubscribeSession();
    }

    if (this.unsubscribeActions) {
      this.unsubscribeActions();
    }

    this.stopPlayerTimer();
  }
}

// Initialize session manager when page loads
let sessionManager = null;

window.addEventListener('DOMContentLoaded', async () => {
  // Only initialize on main game page (not controller)
  if (!window.location.pathname.includes('controller.html')) {
    sessionManager = new SessionManager();
    window.sessionManager = sessionManager; // Make it globally accessible
    await sessionManager.init();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (sessionManager) {
    sessionManager.destroy();
  }
});
