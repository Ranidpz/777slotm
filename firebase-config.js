// Firebase Configuration and Initialization
// This module handles all Firebase Realtime Database connections

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGXQPoawVk-hWU_-XPIpIOb3_8Yk5GVQY",
  authDomain: "slotm-c0090.firebaseapp.com",
  databaseURL: "https://slotm-c0090-default-rtdb.firebaseio.com",
  projectId: "slotm-c0090",
  storageBucket: "slotm-c0090.firebasestorage.app",
  messagingSenderId: "578201903364",
  appId: "1:578201903364:web:c6a9a2ac8da5491f60b051",
  measurementId: "G-3MCERX9P1E"
};

// Initialize Firebase
let app;
let database;

function initFirebase() {
  try {
    // Check if Firebase is already initialized
    if (!firebase.apps || firebase.apps.length === 0) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.apps[0];
    }

    database = firebase.database();
    console.log('✅ Firebase initialized successfully');
    return database;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return null;
  }
}

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get or create session ID (stored in sessionStorage for current tab)
function getSessionId() {
  let sessionId = sessionStorage.getItem('slotMachineSessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('slotMachineSessionId', sessionId);
  }
  return sessionId;
}

// Create new game session in Firebase
async function createSession(sessionId, maxPlayers = 3, maxAttempts = 3) {
  if (!database) return false;

  try {
    // Get WhatsApp number from localStorage
    const whatsappNumber = localStorage.getItem('whatsappNumber') || '';

    await database.ref(`sessions/${sessionId}`).set({
      status: 'waiting',
      maxPlayers: maxPlayers,
      maxAttempts: maxAttempts,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      currentPlayer: null,
      players: {},
      settings: {
        whatsappNumber: whatsappNumber
      }
    });

    console.log('✅ Session created:', sessionId);
    console.log('📱 WhatsApp number saved to session:', whatsappNumber);
    return true;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return false;
  }
}

// Clean up old sessions (older than 1 hour)
async function cleanupOldSessions() {
  if (!database) return;

  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const sessionsRef = database.ref('sessions');

    const snapshot = await sessionsRef.once('value');
    const sessions = snapshot.val();

    if (sessions) {
      Object.keys(sessions).forEach(async (sessionId) => {
        const session = sessions[sessionId];
        if (session.createdAt < oneHourAgo) {
          await database.ref(`sessions/${sessionId}`).remove();
          console.log('🗑️ Cleaned up old session:', sessionId);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error cleaning sessions:', error);
  }
}

// Add player to session
async function addPlayer(sessionId, playerName) {
  if (!database) return null;

  try {
    const sessionRef = database.ref(`sessions/${sessionId}`);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();

    if (!session) {
      console.error('❌ Session not found:', sessionId);
      return null;
    }

    // Generate unique player ID
    const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    // Get current players count
    const players = session.players || {};
    const activePlayers = Object.values(players).filter(p => p.status === 'connected' || p.status === 'active');

    if (activePlayers.length >= session.maxPlayers) {
      return { error: 'full', message: 'המשחק מלא, נא להמתין' };
    }

    // Add player
    const playerData = {
      name: playerName,
      status: activePlayers.length === 0 ? 'active' : 'waiting',
      attemptsLeft: session.maxAttempts,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      lastAction: null
    };

    await database.ref(`sessions/${sessionId}/players/${playerId}`).set(playerData);

    // If this is the first player, set as current
    if (activePlayers.length === 0) {
      await database.ref(`sessions/${sessionId}/currentPlayer`).set(playerId);
    }

    console.log('✅ Player added:', playerId, playerName);
    return { playerId, ...playerData };
  } catch (error) {
    console.error('❌ Error adding player:', error);
    return null;
  }
}

// Remove player from session
async function removePlayer(sessionId, playerId) {
  if (!database) return false;

  try {
    await database.ref(`sessions/${sessionId}/players/${playerId}`).remove();
    console.log('🗑️ Player removed:', playerId);
    return true;
  } catch (error) {
    console.error('❌ Error removing player:', error);
    return false;
  }
}

// Update player status
async function updatePlayerStatus(sessionId, playerId, status) {
  if (!database) return false;

  try {
    await database.ref(`sessions/${sessionId}/players/${playerId}/status`).set(status);
    return true;
  } catch (error) {
    console.error('❌ Error updating player status:', error);
    return false;
  }
}

// Trigger action from player (button press)
async function triggerPlayerAction(sessionId, playerId, action = 'buzz') {
  if (!database) return false;

  try {
    const playerRef = database.ref(`sessions/${sessionId}/players/${playerId}`);

    await playerRef.update({
      lastAction: action,
      lastActionTime: firebase.database.ServerValue.TIMESTAMP,
      status: 'played'
    });

    // Decrement attempts
    const snapshot = await playerRef.child('attemptsLeft').once('value');
    const attemptsLeft = snapshot.val();

    if (attemptsLeft > 0) {
      await playerRef.child('attemptsLeft').set(attemptsLeft - 1);
    }

    console.log('✅ Player action triggered:', playerId, action);
    return true;
  } catch (error) {
    console.error('❌ Error triggering player action:', error);
    return false;
  }
}

// Listen to session changes
function listenToSession(sessionId, callback) {
  if (!database) return null;

  const sessionRef = database.ref(`sessions/${sessionId}`);

  sessionRef.on('value', (snapshot) => {
    const session = snapshot.val();
    callback(session);
  });

  // Return unsubscribe function
  return () => sessionRef.off('value');
}

// Listen to player actions
function listenToPlayerActions(sessionId, callback) {
  if (!database) return null;

  const playersRef = database.ref(`sessions/${sessionId}/players`);

  playersRef.on('child_changed', (snapshot) => {
    const player = snapshot.val();
    const playerId = snapshot.key;

    if (player.lastAction) {
      callback(playerId, player);
    }
  });

  // Return unsubscribe function
  return () => playersRef.off('child_changed');
}

// Get next player in queue
async function getNextPlayer(sessionId) {
  if (!database) return null;

  try {
    const sessionRef = database.ref(`sessions/${sessionId}`);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();

    if (!session || !session.players) return null;

    // Find first waiting player
    const players = Object.entries(session.players);
    const nextPlayer = players.find(([id, player]) => player.status === 'waiting');

    if (nextPlayer) {
      const [playerId, playerData] = nextPlayer;

      // Update current player
      await sessionRef.update({
        currentPlayer: playerId
      });

      // Update player status to active
      await database.ref(`sessions/${sessionId}/players/${playerId}/status`).set('active');

      return { playerId, ...playerData };
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting next player:', error);
    return null;
  }
}

// Reset player action (after spin completes)
async function resetPlayerAction(sessionId, playerId) {
  if (!database) return false;

  try {
    await database.ref(`sessions/${sessionId}/players/${playerId}`).update({
      lastAction: null,
      status: 'waiting'
    });

    return true;
  } catch (error) {
    console.error('❌ Error resetting player action:', error);
    return false;
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initFirebase,
    getSessionId,
    createSession,
    cleanupOldSessions,
    addPlayer,
    removePlayer,
    updatePlayerStatus,
    triggerPlayerAction,
    listenToSession,
    listenToPlayerActions,
    getNextPlayer,
    resetPlayerAction
  };
}
