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

    // Validate initial name and enable button if valid
    this.validateNameInput();

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

  // Validate name input and update button state
  validateNameInput() {
    const nameInput = document.getElementById('player-name-input');
    const connectBtn = document.getElementById('connect-btn');
    const name = nameInput.value.trim();

    if (name.length >= 2) {
      connectBtn.disabled = false;
      connectBtn.classList.add('enabled-pulse');
    } else {
      connectBtn.disabled = true;
      connectBtn.classList.remove('enabled-pulse');
    }
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

    // Name validation - enable button when 2+ characters
    document.getElementById('player-name-input').addEventListener('input', () => {
      this.validateNameInput();
    });

    // Pull bar will be setup when showing playing screen

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
      this.spinSound.preload = 'auto';

      // Event listener לטיפול בשגיאות
      this.spinSound.addEventListener('error', (e) => {
        console.error('❌ Error loading spin sound:', e);
      });

      console.log('🔊 Spin sound loaded');
    } catch (e) {
      console.error('❌ Failed to load spin sound:', e);
    }
  }

  // Play spin sound
  playSpinSound() {
    if (this.spinSound) {
      // עצור את הצליל הנוכחי אם הוא מתנגן
      this.spinSound.pause();
      this.spinSound.currentTime = 0;

      // נסה להפעיל את הצליל
      const playPromise = this.spinSound.play();

      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('Could not play spin sound:', e.message);
        });
      }
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
    console.log('🔄 Player state:', player.status, 'lastResult:', player.lastResult, 'attemptsLeft:', player.attemptsLeft);

    // טיפול במצבים לפי State Machine
    console.log('💫 Switching to status-based screen:', player.status);
    switch (player.status) {
      case 'waiting':
        this.showWaitingScreen(player);
        break;

      case 'active':
        this.showPlayingScreen(player);
        break;

      case 'spinning':
        // הצג מסך "מסתובב..." או השאר את מסך המשחק
        this.showPressedScreen(player);
        break;

      case 'showing_result':
        // הצג מסך זכייה/הפסד
        if (player.lastResult === 'win') {
          console.log('🎉 Showing WIN result screen');
          this.showWinResultScreen(player);
        } else if (player.lastResult === 'loss') {
          console.log('😔 Showing LOSS result screen');
          this.showLossResultScreen(player);
        }
        break;

      case 'timeout':
        this.showTimeoutScreen();
        break;

      case 'finished':
        console.log('🏁 Player finished - showing finished screen');
        this.showFinishedScreen(player);
        break;

      default:
        console.warn(`⚠️ Unknown status: ${player.status}`);
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

    // ⏰ טיימר מוצג רק על המסך הראשי - לא על הטלפון
    // Timer removed from remote controller - only shown on main screen

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
  showPressedScreen(player) {
    // this.stopTimer(); // Timer removed from remote controller
    this.showScreen('pressed-screen');

    // Update attempts left display with the updated player data
    const pressedAttemptsLeft = document.getElementById('pressed-attempts-left');
    if (pressedAttemptsLeft && player) {
      pressedAttemptsLeft.textContent = player.attemptsLeft || 0;
    }

    this.vibrate([200, 100, 200]);
  }

  // Show win result screen
  showWinResultScreen(player) {
    console.log('🎉🎉🎉 SHOWING WIN RESULT SCREEN! 🎉🎉🎉');
    console.log('📦 Player data:', JSON.stringify(player, null, 2));

    // this.stopTimer(); // Timer removed from remote controller
    this.showScreen('win-result-screen');

    // Update attempts left display
    const attemptsLeft = document.getElementById('win-attempts-left');
    if (attemptsLeft) {
      attemptsLeft.textContent = player.attemptsLeft || 0;
      console.log(`📊 Attempts left updated: ${player.attemptsLeft || 0}`);
    }

    // Display prize details if available
    if (player.prizeDetails) {
      const prizeNameElement = document.getElementById('prize-name');
      if (prizeNameElement) {
        const prizeName = player.prizeDetails.prizeName || 'פרס מיוחד';
        prizeNameElement.textContent = `🎁 ${prizeName}`;
        console.log('🏆 הצגת פרטי פרס:', player.prizeDetails);
      }

      // ✅ הצג תמונת פרס אם קיימת
      const prizeImageContainer = document.getElementById('prize-image-container');
      const prizeImage = document.getElementById('prize-image');
      if (prizeImageContainer && prizeImage && player.prizeDetails.symbolDisplay) {
        prizeImage.src = player.prizeDetails.symbolDisplay;
        prizeImageContainer.style.display = 'block';
        console.log('🖼️ תמונת פרס הוצגה');
      } else if (prizeImageContainer) {
        prizeImageContainer.style.display = 'none';
        console.log('⚠️ אין תמונת פרס להצגה');
      }
    } else {
      console.log('⚠️ No prize details available');
    }

    // Setup WhatsApp button if configured
    this.setupWhatsAppButton(player);

    // Vibrate with celebration pattern
    this.vibrate([100, 50, 100, 50, 100, 50, 200]);
  }

  // Setup WhatsApp button with proper link
  async setupWhatsAppButton(player) {
    const whatsappBtn = document.getElementById('whatsapp-btn');
    if (!whatsappBtn) return;

    try {
      // Get WhatsApp number from session settings
      const sessionRef = firebase.database().ref(`sessions/${this.sessionId}/settings/whatsappNumber`);
      const snapshot = await sessionRef.once('value');
      const whatsappNumber = snapshot.val();

      if (whatsappNumber && whatsappNumber.trim() !== '') {
        // Show button
        whatsappBtn.style.display = 'block';

        // Create message with prize details
        let message = 'היי! זכיתי במכונת המזל! 🎰🎉';
        if (player.prizeDetails && player.prizeDetails.prizeName) {
          message = `היי! זכיתי ב-${player.prizeDetails.prizeName} במכונת המזל! 🎰🎉`;
        }

        // Create WhatsApp link
        const encodedMessage = encodeURIComponent(message);
        const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        // Set click handler
        whatsappBtn.onclick = () => {
          window.open(whatsappURL, '_blank');
          this.vibrate(50);
        };

        console.log('📱 כפתור ווטסאפ הופעל:', whatsappNumber);
      } else {
        // Hide button if no WhatsApp configured
        whatsappBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת מספר ווטסאפ:', error);
      whatsappBtn.style.display = 'none';
    }
  }

  // Show loss result screen
  showLossResultScreen(player) {
    // this.stopTimer(); // Timer removed from remote controller
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

    if (!this.sessionId || !this.playerId) {
      console.error('❌ Missing sessionId or playerId');
      return;
    }

    try {
      const playerRef = firebase.database().ref(`sessions/${this.sessionId}/players/${this.playerId}`);
      const snapshot = await playerRef.once('value');
      const player = snapshot.val();

      if (!player) {
        console.error('❌ Player not found');
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
          lastAction: 'continue',  // סמן שהמשתמש לחץ המשך
          prizeDetails: null
        });

        // המסך הראשי יקלוט את השינוי ב-status דרך ה-listener
        console.log('✅ Status updated to active - main screen will handle');

      } else {
        // אין עוד נסיונות - סיים את השחקן
        console.log('🔚 No attempts left - finishing player');

        await playerRef.update({
          status: 'finished',
          lastResult: null,
          lastAction: 'continue',
          prizeDetails: null
        });

        // המסך הראשי יקלוט את status: finished ויסיר את השחקן
        console.log('✅ Status updated to finished - main screen will remove player');
      }

      // Firebase listener will trigger handlePlayerStateChange automatically
    } catch (error) {
      console.error('❌ Error in handleContinueAfterResult:', error);
    }
  }

  // Show timeout screen
  showTimeoutScreen() {
    // this.stopTimer(); // Timer removed from remote controller
    this.showScreen('timeout-screen');
    this.vibrate([100, 50, 100, 50, 100]);
  }

  // Show finished screen
  async showFinishedScreen(player) {
    // this.stopTimer(); // Timer removed from remote controller
    this.showScreen('finished-screen');
    this.vibrate([200, 100, 200, 100, 200]);

    console.log('🏁 Player finished - showing thank you screen');

    // המתן 5 שניות לפני הסרת השחקן
    // זה נותן זמן למסך הראשי להציג את הזכייה עם השם
    setTimeout(async () => {
      if (this.sessionId && this.playerId) {
        try {
          console.log('🗑️ Removing finished player from session after delay:', this.playerId);

          // נקה את currentSpinPlayerId אם זה השחקן הנוכחי
          if (window.sessionManager && sessionManager.currentSpinPlayerId === this.playerId) {
            sessionManager.currentSpinPlayerId = null;
            console.log('🔄 currentSpinPlayerId cleared for finished player');
          }

          // הסר את השחקן מה-session
          await firebase.database().ref(`sessions/${this.sessionId}/players/${this.playerId}`).remove();
          console.log('✅ Player removed from session');

          // קרא לשחקן הבא בתור (אם יש)
          if (typeof getNextPlayer === 'function') {
            await getNextPlayer(this.sessionId);
            console.log('🔄 Next player called');
          }
        } catch (error) {
          console.error('❌ Error removing finished player:', error);
        }
      }
    }, 5000); // 5 שניות - זמן מספיק למסך הראשי להציג את הזכייה
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

    // Reset connect button if showing connection screen
    if (screenId === 'connection-screen') {
      const connectBtn = document.getElementById('connect-btn');
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<span>התחברו למשחק</span>';
      }
    }
  }

  // Show connection screen with finished notice
  showConnectionScreenWithNotice() {
    const finishedNotice = document.getElementById('finished-notice');
    if (finishedNotice) {
      finishedNotice.style.display = 'block';
    }
    this.showScreen('connection-screen');
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

    // this.stopTimer(); // Timer removed from remote controller
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
