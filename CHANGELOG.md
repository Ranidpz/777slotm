# 📋 Changelog - 777 Slot Machine System

## [2.0.0] - 2025-01-14

### ✨ Added - Multi-User Event Management System

#### **New Features:**
- 🔐 **User Authentication System** with Google Sign-In
- 👥 **Multi-user support** with roles (Super Admin, Event Manager)
- 🎮 **Event Management Dashboard** for producers
- 📊 **Statistics & Analytics** for Super Admin
- 🎁 **Prize Coding System** with unique codes (PRIZE_001, PRIZE_002...)
- ☁️ **Firebase Backup** for prizes and event data
- 🏆 **Per-Event Scoreboard** (separate winners per event)

#### **New Files:**
1. **dashboard.html** - Event management dashboard
2. **dashboard.css** - Professional dashboard styling (RTL Hebrew)
3. **auth-manager.js** - User authentication & authorization
4. **events-manager.js** - Event creation, editing, deletion

#### **Modified Files:**
1. **dynamic-images.js**
   - Added `code` field to prizes (PRIZE_001, PRIZE_002...)
   - Added `symbolIndex` field for reel position
   - Added `saveToFirebase()` method for cloud backup
   - Added `loadFromFirebase()` method for auto-recovery
   - Backward compatibility for old data

2. **session-manager.js**
   - Updated `saveWinnerToScoreboard()` to save `prizeCode`
   - Added redemption fields: `redemptionCode`, `redeemed`, `redeemedAt`, `redeemedBy`
   - Changed winners path: `sessions/{sessionId}/winners` (per-session)
   - Auto-load prizes from Firebase on init

3. **script.js**
   - Auto-save prizes to Firebase when clicking "Save Settings"
   - Prize code tracking in `checkWin()`

4. **scoreboard.html**
   - Load winners by sessionId from URL or localStorage
   - Changed path: `sessions/{sessionId}/winners`

---

## [1.5.0] - 2025-01-13

### 🐛 Fixed - Remote Control & Timer Issues

#### **Fixes:**
1. **Timer System Redesign**
   - Timer starts on player connect
   - Timer stops only on buzz press
   - Timer restarts after wheels stop
   - Added `restartPlayerTimer()` method

2. **Second Spin Freeze Fix**
   - QR popup no longer blocks remote players
   - Remote players bypass QR check in `triggerSpin()`

3. **Player Name Display Fix**
   - Player name shows correctly on final attempt (status: 'finished')
   - Added 'finished' status to `showQRCodeIfNeeded()` checks

4. **Auto-Remove Finished Players**
   - 5-second delay before removing player
   - Allows main screen to display win message with name

5. **Scoreboard Permissions**
   - Added `/winners` path to Firebase Rules

---

## Database Structure

### Firebase Realtime Database:

```
Firebase:
├─ users/                           # משתמשים
│  └─ {userId}/
│     ├─ email: "user@example.com"
│     ├─ displayName: "User Name"
│     ├─ photoURL: "https://..."
│     ├─ role: "super_admin" | "event_manager"
│     ├─ createdAt: timestamp
│     ├─ lastLogin: timestamp
│     ├─ permissions: {
│     │    canCreateEvents: boolean,
│     │    canDeleteEvents: boolean,
│     │    maxActiveSessions: number
│     │  }
│     └─ stats: {
│          totalEvents: number,
│          totalWinners: number
│        }
│
├─ events/                          # אירועים
│  └─ {eventId}/
│     ├─ name: "Event Name"
│     ├─ ownerId: {userId}
│     ├─ ownerName: "Owner Name"
│     ├─ sessionId: "slot_xxx_yyy"
│     ├─ status: "active" | "closed"
│     ├─ location: "Venue Name"
│     ├─ eventDate: timestamp
│     ├─ description: "Event description"
│     ├─ createdAt: timestamp
│     ├─ updatedAt: timestamp
│     ├─ prizes/                    # פרסים
│     │  └─ {prizeCode}/            # PRIZE_001, PRIZE_002...
│     │     ├─ code: "PRIZE_001"
│     │     ├─ name: "Prize Name"
│     │     ├─ symbol: "🎁"
│     │     ├─ imageUrl: "data:image/..."
│     │     ├─ inventory: number | null
│     │     ├─ initialInventory: number | null
│     │     ├─ symbolIndex: number
│     │     └─ updatedAt: timestamp
│     │
│     ├─ winners/                   # זוכים (deprecated - moved to sessions)
│     └─ stats: {
│          totalPlayers: number,
│          totalWinners: number,
│          totalSpins: number
│        }
│
└─ sessions/                        # סשנים (existing structure)
   └─ {sessionId}/
      ├─ createdAt: timestamp
      ├─ status: "active"
      ├─ currentPlayerId: string
      ├─ players/
      │  └─ {playerId}/
      │     ├─ name: string
      │     ├─ status: "waiting" | "active" | "played" | "finished"
      │     ├─ attemptsLeft: number
      │     ├─ joinedAt: timestamp
      │     └─ ...
      │
      ├─ winners/                   # זוכים לפי סשן
      │  └─ {winnerId}/
      │     ├─ playerName: string
      │     ├─ prizeCode: "PRIZE_001"    # ✅ NEW
      │     ├─ prizeName: string
      │     ├─ prizeSymbol: string
      │     ├─ timestamp: timestamp
      │     ├─ sessionId: string
      │     ├─ playerId: string
      │     ├─ redemptionCode: string | null  # ✅ NEW (future)
      │     ├─ redeemed: boolean             # ✅ NEW (future)
      │     ├─ redeemedAt: timestamp | null  # ✅ NEW (future)
      │     └─ redeemedBy: string | null     # ✅ NEW (future)
      │
      └─ prizes/                    # פרסים (backup from events)
         └─ {prizeCode}/
            └─ ... (same as events/prizes)
```

---

## File Structure

```
777slotzone/
├── 📱 Game Files
│   ├── index.html              # Main slot machine game
│   ├── style.css               # Game styling
│   ├── script.js               # Game logic
│   └── sounds/                 # Sound effects
│
├── 🎮 Remote Control
│   ├── controller.html         # Mobile controller
│   ├── controller.css          # Controller styling
│   ├── controller.js           # Controller logic
│   ├── session-manager.js      # Session & player management
│   └── remote-control-settings.js  # Settings helper
│
├── 🏆 Scoreboard
│   └── scoreboard.html         # Winners leaderboard
│
├── 👥 Dashboard (NEW)
│   ├── dashboard.html          # Event management dashboard
│   ├── dashboard.css           # Dashboard styling
│   ├── auth-manager.js         # User auth & roles
│   └── events-manager.js       # Event CRUD operations
│
├── 🎁 Prize Management
│   └── dynamic-images.js       # Prize config with codes & Firebase backup
│
├── 🔧 Configuration
│   └── firebase-config.js      # Firebase configuration
│
└── 📚 Documentation
    ├── README.md               # Project overview
    ├── CHANGELOG.md            # This file
    └── SETUP.md                # Setup instructions
```

---

## Setup Instructions

### 1. Firebase Configuration

#### Enable Google Authentication:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project `slotm-c0090`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider

#### Update Database Rules:
Go to **Realtime Database** → **Rules** and paste:

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "$userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'super_admin'",
        ".write": "$userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'super_admin'"
      }
    },
    "events": {
      ".read": "auth != null",
      "$eventId": {
        ".write": "auth != null && (!data.exists() || data.child('ownerId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'super_admin')",
        "prizes": {
          ".read": true,
          ".write": "data.parent().child('ownerId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'super_admin'"
        },
        "winners": { ".read": true, ".write": true },
        "players": { ".read": true, ".write": true },
        "stats": { ".read": true, ".write": true }
      }
    },
    "sessions": {
      ".read": true,
      ".write": true
    },
    "admin": {
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'super_admin'",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'super_admin'"
    }
  }
}
```

### 2. Set Super Admin

1. Open `dashboard.html` and sign in with your Google account
2. Go to Firebase Console → Realtime Database → Data
3. Navigate to `users/{your-uid}/role`
4. Change value from `"event_manager"` to `"super_admin"`
5. Refresh dashboard

---

## User Roles & Permissions

### 👑 Super Admin
- ✅ View all events from all users
- ✅ Create/edit/delete any event
- ✅ View system statistics
- ✅ Manage users
- ✅ Access admin panel

### 👤 Event Manager
- ✅ Create new events
- ✅ Edit own events
- ✅ View own events only
- ✅ Configure prizes for own events
- ✅ View own winners
- ❌ Cannot see other users' events
- ❌ Cannot access admin panel

---

## Usage Flow

### For Event Managers:
1. Login at `dashboard.html`
2. Click "אירוע חדש" (New Event)
3. Fill in event details
4. Click "פתח משחק" (Open Game)
5. Configure prizes in settings
6. Share QR code with guests
7. View winners in scoreboard

### For Super Admin:
- All Event Manager features +
- View all events across all users
- Manage users via "ניהול משתמשים"
- View system-wide statistics

---

## Breaking Changes

### From v1.x to v2.0:

1. **Winners Storage Location Changed:**
   - Old: `/winners` (global)
   - New: `/sessions/{sessionId}/winners` (per-session)
   - Migration: Old winners remain accessible

2. **Prize Structure Enhanced:**
   - Added `code` field (PRIZE_001, PRIZE_002...)
   - Added `symbolIndex` field
   - Old prizes auto-upgrade on load

3. **New Authentication Required:**
   - Dashboard requires Google Sign-In
   - Game still works without login
   - Remote control still works without login

---

## Future Features (Planned)

- [ ] QR Code for prize redemption
- [ ] Redemption tracking system
- [ ] Multi-location prize redemption
- [ ] Event templates
- [ ] Bulk prize import
- [ ] Email notifications
- [ ] Event analytics dashboard
- [ ] Prize inventory alerts
- [ ] Custom branding per event

---

## Technical Notes

### Prize Code Format:
- Format: `PRIZE_XXX` where XXX is zero-padded (001, 002, ...)
- Unique per event
- Used for tracking and redemption

### Session Management:
- Each event has unique `sessionId`
- Sessions are temporary (can be cleaned up)
- Events are permanent (unless deleted)

### Firebase Backup:
- Prizes auto-save to Firebase on "Save Settings"
- Prizes auto-load from Firebase on game start
- localStorage used as local cache

---

## Support & Contact

- **Developer:** Claude (Anthropic)
- **Client:** Playzone (admin@playzone.co.il)
- **Firebase Project:** slotm-c0090
- **Domain:** 777.playzones.app

---

## License

Proprietary - All rights reserved by Playzone
