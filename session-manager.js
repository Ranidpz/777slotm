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
  }

  // Initialize session manager
  async init() {
    console.log('🚀 Initializing Session Manager...');

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

    // Create session in Firebase
    const maxAttempts = parseInt(localStorage.getItem('maxPlayerAttempts')) || 3;
    await createSession(this.sessionId, 3, maxAttempts);

    // Generate QR code
    this.generateQRCode();

    // Start listening to session changes
    this.startListening();

    // Add click handler to skip current player
    this.setupPlayerInfoClickHandler();

    return true;
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

    // Clear previous content
    qrContainer.innerHTML = '';

    // Create QR code URL
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const controllerUrl = `${baseUrl}controller.html?session=${this.sessionId}`;

    console.log('🔗 Controller URL:', controllerUrl);

    // Generate QR code using qrcode.js library
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

    qrContainer.appendChild(qrCodeDiv);
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

    const qrContainer = document.getElementById('qr-container');
    const qrDisplay = document.getElementById('qr-display');
    const playerInfo = document.getElementById('player-info');

    if (!qrContainer || !qrDisplay || !playerInfo) return;

    const players = this.currentSession.players || {};
    const currentPlayerId = this.currentSession.currentPlayer;

    if (currentPlayerId && players[currentPlayerId]) {
      const player = players[currentPlayerId];

      // Show player info instead of QR
      this.currentPlayer = { id: currentPlayerId, ...player };
      qrDisplay.style.display = 'none';
      playerInfo.style.display = 'block';

      this.updatePlayerInfo();

      // Only start timer if player is 'active' and not 'played'
      // Don't start timer if they just pressed the button
      if (player.status === 'active' && !player.lastAction) {
        this.startPlayerTimer();
      } else if (player.status === 'played' || player.lastAction === 'buzz') {
        // Stop timer if they already played
        this.stopPlayerTimer();
      }
    } else {
      // Show QR code
      this.currentPlayer = null;
      qrDisplay.style.display = 'block';
      playerInfo.style.display = 'none';

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

  // Handle player timeout (didn't press button in time)
  async handlePlayerTimeout() {
    console.log('⏰ Player timeout:', this.currentPlayer?.id);

    this.stopPlayerTimer();

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

    if (player.lastAction === 'buzz') {
      console.log('🎯 Pull bar action detected! Triggering spin...');

      // Stop timer
      this.stopPlayerTimer();

      // DON'T play buzzer sound here - let the game handle it

      // Store reference to check result later
      this.currentSpinPlayerId = playerId;

      // Trigger spin (if in automatic mode)
      if (typeof triggerSpin === 'function' && gameState.mode === 'automatic') {
        console.log('🎰 Calling triggerSpin() for automatic mode');
        triggerSpin();
      } else {
        console.log('⚠️ Manual mode - spin not triggered automatically');
      }

      // Wait for spin to complete (automatic mode: ~4-5 seconds)
      const spinDuration = gameState.mode === 'automatic' ? 5000 : 8000;

      // Wait for spin to complete, then check result and update player
      setTimeout(async () => {
        // Get updated player data to check actual attempts left
        const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${playerId}`);
        const snapshot = await playerRef.once('value');
        const updatedPlayer = snapshot.val();

        if (!updatedPlayer || updatedPlayer.attemptsLeft <= 0) {
          // Remove player - no more attempts
          console.log('🔚 Player finished all attempts:', playerId);
          await removePlayer(this.sessionId, playerId);
          await getNextPlayer(this.sessionId);
        } else {
          // Reset player to waiting status
          console.log('↩️ Player has', updatedPlayer.attemptsLeft, 'attempts left');
          await resetPlayerAction(this.sessionId, playerId);
          await getNextPlayer(this.sessionId);
        }
      }, spinDuration + 1000); // Wait for spin animation to complete
    }
  }

  // Store spin result for current player
  async storeSpinResult(isWin) {
    if (!this.currentSpinPlayerId) return;

    try {
      await firebase.database().ref(`sessions/${this.sessionId}/players/${this.currentSpinPlayerId}`).update({
        lastResult: isWin ? 'win' : 'loss',
        lastResultTime: firebase.database.ServerValue.TIMESTAMP
      });

      console.log(`📊 Stored ${isWin ? 'WIN' : 'LOSS'} result for player:`, this.currentSpinPlayerId);
    } catch (error) {
      console.error('❌ Error storing spin result:', error);
    }
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
    await sessionManager.init();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (sessionManager) {
    sessionManager.destroy();
  }
});
