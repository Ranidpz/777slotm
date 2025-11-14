# 🎰 777 Slot Machine - Multi-User Event Management System

> מערכת מתקדמת למכונת מזל עם ניהול אירועים, משתמשים מרובים, ושליטה מרחוק

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Ranidpz/777slotm)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange.svg)](https://firebase.google.com)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

---

## ✨ תכונות עיקריות

### 🎮 מערכת משחק
- מכונת מזל 777 מלאה עם 3 גלגלים
- תמיכה באימוג'ים ותמונות מותאמות אישית
- ניהול מלאי פרסים דינמי
- צלילים מותאמים אישית
- מצבי משחק: זכייה מובטחת / אקראי

### 👥 ניהול משתמשים
- **התחברות עם Google** (Firebase Authentication)
- **2 סוגי משתמשים:**
  - 👑 **Super Admin** - ניהול מלא של המערכת
  - 👤 **Event Manager** - מפיק אירועים

### 🎪 ניהול אירועים
- יצירה, עריכה ומחיקה של אירועים
- הגדרת פרסים לכל אירוע
- מעקב אחר זוכים לפי אירוע
- לוח ניקוד נפרד לכל אירוע
- סטטיסטיקות מפורטות

### 📱 שליטה מרחוק
- אורחים משחקים מהטלפון
- QR Code להתחברות מהירה
- ניהול תור שחקנים
- טיימר לכל שחקן
- מסכים מעוצבים לזכייה/הפסד

### 🎁 מערכת פרסים מתקדמת
- קודים ייחודיים לכל פרס (PRIZE_001, PRIZE_002...)
- גיבוי אוטומטי ב-Firebase
- שחזור אוטומטי במקרה של בעיה
- תמיכה בפדיון עתידי עם QR

### 🏆 לוח זוכים
- רשימת זוכים בזמן אמת
- סטטיסטיקות: סה"כ זוכים, זוכים היום, פרס פופולרי
- מיון לפי זמן
- תצוגה ויזואלית מרשימה

---

## 🚀 התקנה מהירה

### 1. הפעלת Authentication
```bash
Firebase Console → Authentication → Sign-in method → Enable Google
```

### 2. עדכון Database Rules
```bash
Firebase Console → Realtime Database → Rules → (ראה CHANGELOG.md) → Publish
```

### 3. הגדרת Super Admin
```bash
1. פתח dashboard.html → התחבר עם Google
2. Firebase Console → Database → users/{uid}/role → שנה ל-"super_admin"
3. רענן dashboard
```

---

## 📋 מבנה קבצים

```
777slotzone/
├── 📱 Game (משחק)
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── 🎮 Remote Control (שליטה מרחוק)
│   ├── controller.html
│   ├── controller.js
│   ├── session-manager.js
│   └── remote-control-settings.js
│
├── 🏆 Scoreboard (לוח זוכים)
│   └── scoreboard.html
│
├── 👥 Dashboard (דשבורד ניהול) ✨ NEW
│   ├── dashboard.html
│   ├── dashboard.css
│   ├── auth-manager.js
│   └── events-manager.js
│
├── 🎁 Prize Management (ניהול פרסים)
│   └── dynamic-images.js
│
└── 📚 Documentation (תיעוד)
    ├── README.md (this file)
    └── CHANGELOG.md (full documentation)
```

---

## 🔐 תפקידים והרשאות

### 👑 Super Admin
✅ כל האירועים | ✅ ניהול משתמשים | ✅ סטטיסטיקות מערכת

### 👤 Event Manager
✅ האירועים שלי | ✅ הגדרת פרסים | ❌ אירועים של אחרים

---

## 💻 שימוש מהיר

### למפיק:
```bash
1. dashboard.html → התחבר
2. "אירוע חדש" → מלא פרטים → שמור
3. "פתח משחק" → הגדר פרסים → שמור
4. הצג QR לאורחים
5. "לוח זוכים" לצפייה בזוכים
```

### למנהל ראשי:
```bash
כל מה שמפיק יכול +
- "ניהול משתמשים"
- צפייה בכל האירועים
- סטטיסטיקות מערכת
```

---

## 🗄️ מבנה Database

```javascript
Firebase:
├─ users/              # משתמשים + הרשאות
├─ events/             # אירועים + פרסים
└─ sessions/           # סשנים + זוכים
   └─ {sessionId}/
      ├─ players/
      └─ winners/      # זוכים לפי סשן ✨
```

---

## 🔮 תכונות עתידיות

- [ ] QR לפדיון פרסים
- [ ] מערכת פדיון מרחוק
- [ ] תבניות אירועים
- [ ] ייבוא פרסים CSV
- [ ] אנליטיקס מתקדם
- [ ] התראות מלאי
- [ ] ברנדינג מותאם
- [ ] PWA Support

---

## 📞 תמיכה

- **Email:** admin@playzone.co.il
- **Website:** https://playzone.co.il
- **Firebase:** slotm-c0090
- **GitHub:** https://github.com/Ranidpz/777slotm

---

## 📄 רישיון

© 2025 Playzone. All rights reserved.

---

**Built with ❤️ by Claude & Playzone Team**

*לתיעוד מלא ראה [CHANGELOG.md](CHANGELOG.md)*
