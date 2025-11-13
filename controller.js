// Mobile Controller Logic
// Handles player connection, button presses, and state management

class MobileController {
  constructor() {
    this.sessionId = null;
    this.playerId = null;
    this.playerName = null;
    this.database = null;
    this.unsubscribePlayer = null;
    this.unsubscribeSession = null;
    this.timerInterval = null;
    this.timeLeft = 30;
    this.maxWaitTime = 30;
    this.hasVibration = 'vibrate' in navigator;

    // Pull bar state
    this.pullBarHandle = null;
    this.pullBarFill = null;
    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
    this.pullBarTrackHeight = 0;
    this.pullThreshold = 0.7; // 70% pull required

    // Spin sound
    this.spinSound = null;
  }

  // Initialize controller
  async init() {
    console.log('🎮 Initializing Mobile Controller...');

    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get('session');

    if (!this.sessionId) {
      this.showError('קוד Session לא נמצא. אנא סרוק את ה-QR שוב.');
      return;
    }

    console.log('📱 Session ID:', this.sessionId);

    // Initialize Firebase
    this.database = initFirebase();
    if (!this.database) {
      this.showError('שגיאת חיבור לשרת. אנא נסה שוב.');
      return;
    }

    // Check if player name is stored
    const storedName = localStorage.getItem(`player_${this.sessionId}`);
    if (storedName) {
      document.getElementById('player-name-input').value = storedName;
    } else {
      // Generate random name
      this.generateRandomName();
    }

    // Setup event listeners
    this.setupEventListeners();

    // Show connection screen
    this.showScreen('connection-screen');
  }

  // Generate random player name
  generateRandomName() {
    const adjectives = ['מהירים', 'חזקים', 'חכמים', 'אמיצים', 'שמחים', 'מצליחים'];
    const nouns = ['שחקנים', 'גיבורים', 'אלופים', 'מנצחים', 'כוכבים'];
    const random = Math.floor(Math.random() * 1000);
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${random}`;

    document.getElementById('player-name-input').value = name;
  }

  // Setup event listeners
  setupEventListeners() {
    // Connect button
    document.getElementById('connect-btn').addEventListener('click', () => {
      this.connectToGame();
    });

    // Enter key in input
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.connectToGame();
      }
    });

    // Pull bar will be setup when showing playing screen

    // Retry button
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.showScreen('connection-screen');
    });

    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.showScreen('connection-screen');
    });

    // Continue after win button
    document.getElementById('continue-after-win-btn').addEventListener('click', () => {
      this.handleContinueAfterResult();
    });

    // Continue after loss button
    document.getElementById('continue-after-loss-btn').addEventListener('click', () => {
      this.handleContinueAfterResult();
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      location.reload();
    });

    // Load spin sound
    this.loadSpinSound();

    // Prevent accidental navigation
    window.addEventListener('beforeunload', (e) => {
      if (this.playerId) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // Load spin sound
  loadSpinSound() {
    try {
      this.spinSound = new Audio('sounds/prize-wheel.mp3');
      this.spinSound.volume = 0.5;
      console.log('🔊 Spin sound loaded');
    } catch (e) {
      console.error('❌ Failed to load spin sound:', e);
    }
  }

  // Play spin sound
  playSpinSound() {
    if (this.spinSound) {
      this.spinSound.currentTime = 0;
      this.spinSound.play().catch(e => {
        console.log('Could not play spin sound:', e);
      });
    }
  }

  // Connect to game
  async connectToGame() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();

    if (!name || name.length < 2) {
      this.showErrorMessage('אנא הכנס שם בן לפחות 2 תווים');
      this.vibrate(100);
      return;
    }

    this.playerName = name;

    // Save name
    localStorage.setItem(`player_${this.sessionId}`, name);

    // Disable button
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.disabled = true;
    connectBtn.textContent = 'מתחבר...';

    // Add player to session
    const result = await addPlayer(this.sessionId, name);

    if (!result) {
      this.showError('שגיאת חיבור. אנא נסה שוב.');
      connectBtn.disabled = false;
      connectBtn.innerHTML = '<span class="btn-icon">🎮</span><span>התחבר למשחק</span>';
      return;
    }

    if (result.error === 'full') {
      this.showErrorMessage(result.message);
      connectBtn.disabled = false;
      connectBtn.innerHTML = '<span class="btn-icon">🎮</span><span>התחבר למשחק</span>';
      this.vibrate(100);
      return;
    }

    this.playerId = result.playerId;
    console.log('✅ Connected as:', this.playerId);

    // Start listening to player state
    this.startListening();

    // Vibrate on success
    this.vibrate(200);
  }

  // Start listening to player state
  startListening() {
    if (!this.database || !this.sessionId || !this.playerId) return;

    // Listen to player changes
    const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${this.playerId}`);

    this.unsubscribePlayer = playerRef.on('value', (snapshot) => {
      const player = snapshot.val();

      if (!player) {
        // Player removed
        console.log('❌ Player removed from session');
        this.cleanup();
        this.showScreen('connection-screen');
        return;
      }

      this.handlePlayerStateChange(player);
    });

    // Listen to session changes
    const sessionRef = firebase.database().ref(`sessions/${this.sessionId}`);

    this.unsubscribeSession = sessionRef.on('value', (snapshot) => {
      const session = snapshot.val();

      if (!session) {
        this.showError('הסשן הסתיים. אנא סרוק QR חדש.');
        return;
      }

      this.handleSessionChange(session);
    });
  }

  // Handle player state change
  handlePlayerStateChange(player) {
    console.log('🔄 Player state:', player.status);

    // Check if there's a result to show
    if (player.lastResult && player.status === 'played') {
      if (player.lastResult === 'win') {
        this.showWinResultScreen(player);
        return;
      } else if (player.lastResult === 'loss') {
        this.showLossResultScreen(player);
        return;
      }
    }

    switch (player.status) {
      case 'waiting':
        this.showWaitingScreen(player);
        break;

      case 'active':
        this.showPlayingScreen(player);
        break;

      case 'played':
        // Only show pressed screen if no result yet
        if (!player.lastResult) {
          this.showPressedScreen();
        }
        break;

      case 'timeout':
        this.showTimeoutScreen();
        break;

      case 'finished':
        this.showFinishedScreen(player);
        break;
    }
  }

  // Handle session change
  handleSessionChange(session) {
    // Update queue position if waiting
    if (session.players && this.playerId) {
      const players = Object.entries(session.players);
      const waitingPlayers = players.filter(([id, p]) => p.status === 'waiting');
      const myIndex = waitingPlayers.findIndex(([id]) => id === this.playerId);

      if (myIndex >= 0) {
        const queuePosition = document.getElementById('queue-position');
        if (queuePosition) {
          queuePosition.textContent = myIndex + 1;
        }
      }
    }
  }

  // Show waiting screen
  showWaitingScreen(player) {
    this.showScreen('waiting-screen');

    const playerNameDisplay = document.getElementById('waiting-player-name');
    if (playerNameDisplay) {
      playerNameDisplay.textContent = player.name;
    }
  }

  // Show playing screen
  showPlayingScreen(player) {
    this.showScreen('playing-screen');

    // Update player name
    const activePlayerName = document.getElementById('active-player-name');
    if (activePlayerName) {
      activePlayerName.textContent = player.name;
    }

    // Update attempts
    const attemptsCount = document.getElementById('attempts-count');
    if (attemptsCount) {
      attemptsCount.textContent = player.attemptsLeft || 0;
    }

    // Setup pull bar
    this.setupPullBar();

    // Start countdown timer
    this.startTimer();

    // Vibrate to notify player
    this.vibrate([100, 50, 100]);
  }

  // Setup pull bar interaction
  setupPullBar() {
    this.pullBarHandle = document.getElementById('pull-bar-handle');
    this.pullBarFill = document.getElementById('pull-bar-fill');

    if (!this.pullBarHandle || !this.pullBarFill) return;

    // Get track height
    const track = document.querySelector('.pull-bar-track');
    this.pullBarTrackHeight = track ? track.offsetHeight : 350;

    // Remove old listeners if any
    this.pullBarHandle.replaceWith(this.pullBarHandle.cloneNode(true));
    this.pullBarHandle = document.getElementById('pull-bar-handle');

    // Touch events
    this.pullBarHandle.addEventListener('touchstart', (e) => this.handlePullStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handlePullMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handlePullEnd(e), { passive: false });

    // Mouse events (for testing)
    this.pullBarHandle.addEventListener('mousedown', (e) => this.handlePullStart(e));
    document.addEventListener('mousemove', (e) => this.handlePullMove(e));
    document.addEventListener('mouseup', (e) => this.handlePullEnd(e));

    console.log('🎮 Pull bar setup complete');
  }

  // Handle pull start
  handlePullStart(e) {
    e.preventDefault();

    this.isDragging = true;
    this.pullBarHandle.classList.add('dragging');

    const touch = e.touches ? e.touches[0] : e;
    this.startY = touch.clientY;
    this.currentY = 0;

    // Vibrate on grab
    this.vibrate(50);

    console.log('🎯 Pull started');
  }

  // Handle pull move
  handlePullMove(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const deltaY = Math.max(0, touch.clientY - this.startY); // Only allow downward drag
    const maxPull = this.pullBarTrackHeight - 80; // Account for handle size

    this.currentY = Math.min(deltaY, maxPull);

    // Update handle position
    this.pullBarHandle.style.top = this.currentY + 'px';

    // Update fill bar
    const fillPercentage = (this.currentY / maxPull) * 100;
    this.pullBarFill.style.height = fillPercentage + '%';

    // Add class when near bottom
    if (fillPercentage > this.pullThreshold * 100) {
      this.pullBarHandle.classList.add('at-bottom');
    } else {
      this.pullBarHandle.classList.remove('at-bottom');
    }

    // Vibrate at milestones
    if (fillPercentage >= 50 && fillPercentage < 55) {
      this.vibrate(30);
    } else if (fillPercentage >= this.pullThreshold * 100 && fillPercentage < this.pullThreshold * 100 + 5) {
      this.vibrate(50);
    }
  }

  // Handle pull end (release)
  handlePullEnd(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    this.isDragging = false;
    this.pullBarHandle.classList.remove('dragging');
    this.pullBarHandle.classList.remove('at-bottom');

    const maxPull = this.pullBarTrackHeight - 80;
    const pullPercentage = this.currentY / maxPull;

    console.log(`🎯 Pull released at ${Math.round(pullPercentage * 100)}%`);

    // Check if pulled enough
    if (pullPercentage >= this.pullThreshold) {
      console.log('✅ Pull threshold reached! Triggering action...');

      // Play spin sound
      this.playSpinSound();

      // Strong vibration on success
      this.vibrate([100, 50, 100, 50, 200]);

      // Trigger the action
      this.pressBuzzButton();
    } else {
      console.log('❌ Pull not strong enough');
      this.vibrate(100);
    }

    // Animate back to top
    this.pullBarHandle.style.transition = 'top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.pullBarHandle.style.top = '0px';
    this.pullBarFill.style.height = '0%';

    setTimeout(() => {
      this.pullBarHandle.style.transition = '';
    }, 300);
  }

  // Show pressed screen
  showPressedScreen() {
    this.stopTimer();
    this.showScreen('pressed-screen');
    this.vibrate([200, 100, 200]);
  }

  // Show win result screen
  showWinResultScreen(player) {
    this.stopTimer();
    this.showScreen('win-result-screen');

    // Update attempts left display
    const attemptsLeft = document.getElementById('win-attempts-left');
    if (attemptsLeft) {
      attemptsLeft.textContent = player.attemptsLeft || 0;
    }

    // Vibrate with celebration pattern
    this.vibrate([100, 50, 100, 50, 100, 50, 200]);
  }

  // Show loss result screen
  showLossResultScreen(player) {
    this.stopTimer();
    this.showScreen('loss-result-screen');

    // Update attempts left display
    const attemptsLeft = document.getElementById('loss-attempts-left');
    if (attemptsLeft) {
      attemptsLeft.textContent = player.attemptsLeft || 0;
    }

    // Vibrate with gentle pattern
    this.vibrate([100, 100, 100]);
  }

  // Handle continue after result
  async handleContinueAfterResult() {
    console.log('▶️ Continue button pressed');

    // Vibrate feedback
    this.vibrate(100);

    // Clear the result in Firebase so it doesn't show again
    if (this.sessionId && this.playerId) {
      try {
        await firebase.database().ref(`sessions/${this.sessionId}/players/${this.playerId}/lastResult`).remove();
        console.log('✅ Result cleared, waiting for next turn...');
      } catch (error) {
        console.error('❌ Error clearing result:', error);
      }
    }

    // The player state will update automatically via Firebase listener
    // It will either go back to waiting or active for next attempt
  }

  // Show timeout screen
  showTimeoutScreen() {
    this.stopTimer();
    this.showScreen('timeout-screen');
    this.vibrate([100, 50, 100, 50, 100]);
  }

  // Show finished screen
  showFinishedScreen(player) {
    this.stopTimer();
    this.showScreen('finished-screen');

    const totalAttempts = document.getElementById('total-attempts');
    if (totalAttempts && player.attemptsLeft !== undefined) {
      const maxAttempts = parseInt(localStorage.getItem('maxPlayerAttempts')) || 3;
      totalAttempts.textContent = maxAttempts - player.attemptsLeft;
    }

    this.vibrate(300);
  }

  // Start countdown timer
  startTimer() {
    this.stopTimer(); // Clear any existing timer

    this.timeLeft = this.maxWaitTime;

    const timerNumber = document.getElementById('timer-number');
    const timerBarProgress = document.getElementById('timer-bar-progress');

    this.timerInterval = setInterval(() => {
      this.timeLeft--;

      // Update number
      if (timerNumber) {
        timerNumber.textContent = this.timeLeft;
      }

      // Update bar progress
      if (timerBarProgress) {
        const percentage = (this.timeLeft / this.maxWaitTime) * 100;
        timerBarProgress.style.setProperty('--progress-width', percentage + '%');

        // Update the ::after pseudo-element width via inline style
        const afterElement = timerBarProgress.querySelector('::after');
        if (timerBarProgress.style) {
          timerBarProgress.style.width = '100%';
          // Use CSS variable for the ::after element
          timerBarProgress.style.setProperty('--timer-width', percentage + '%');
        }
      }

      // Vibrate at milestones
      if (this.timeLeft === 10 || this.timeLeft === 5) {
        this.vibrate(50);
      }

      if (this.timeLeft <= 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  // Stop countdown timer
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Press buzz button (triggered by pull bar)
  async pressBuzzButton() {
    console.log('🔴 Pull bar triggered action!');
    console.log('📡 Sending action to Firebase - Session:', this.sessionId, 'Player:', this.playerId);

    // Vibrate strongly
    this.vibrate(300);

    // Trigger action in Firebase
    const success = await triggerPlayerAction(this.sessionId, this.playerId, 'buzz');

    if (!success) {
      console.error('❌ Failed to trigger action in Firebase');
      this.vibrate(100);
      return;
    }

    console.log('✅ Action sent successfully to Firebase');

    // Show pressed screen
    this.showPressedScreen();
  }

  // Vibrate device
  vibrate(pattern) {
    if (this.hasVibration) {
      navigator.vibrate(pattern);
    }
  }

  // Show screen
  showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }
  }

  // Show error message (inline)
  showErrorMessage(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 4000);
    }
  }

  // Show error screen
  showError(message) {
    this.showScreen('error-screen');

    const errorText = document.getElementById('error-text');
    if (errorText) {
      errorText.textContent = message;
    }

    this.vibrate([100, 50, 100]);
  }

  // Cleanup listeners
  cleanup() {
    if (this.unsubscribePlayer) {
      firebase.database().ref(`sessions/${this.sessionId}/players/${this.playerId}`).off('value');
      this.unsubscribePlayer = null;
    }

    if (this.unsubscribeSession) {
      firebase.database().ref(`sessions/${this.sessionId}`).off('value');
      this.unsubscribeSession = null;
    }

    this.stopTimer();
  }

  // Destroy controller
  destroy() {
    this.cleanup();

    if (this.playerId && this.sessionId) {
      removePlayer(this.sessionId, this.playerId);
    }
  }
}

// Initialize controller when page loads
let mobileController = null;

window.addEventListener('DOMContentLoaded', async () => {
  mobileController = new MobileController();
  await mobileController.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (mobileController) {
    mobileController.destroy();
  }
});

// Handle visibility change (app goes to background)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('📱 App went to background');
  } else {
    console.log('📱 App came to foreground');
  }
});
