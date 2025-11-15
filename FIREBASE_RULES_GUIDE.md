# Firebase Database Rules - מדריך עדכון כללים

## אזהרת ביצועים שהתקבלה

```
@firebase/database: FIREBASE WARNING: Using an unspecified index.
Your data will be downloaded and filtered on the client.
Consider adding ".indexOn": "ownerId" at /events to your security rules
for better performance.
```

## פתרון - הוספת אינדקס ל-ownerId

### שלב 1: כניסה ל-Firebase Console
1. פתח את [Firebase Console](https://console.firebase.google.com)
2. בחר את הפרויקט: **slotm-c0090**
3. מתפריט הצד, לחץ על **Realtime Database**

### שלב 2: עדכון כללי האבטחה
1. לחץ על הטאב **Rules** (כללים)
2. הוסף את האינדקס הבא לתוך הכללים הקיימים:

```json
{
  "rules": {
    "events": {
      ".indexOn": ["ownerId", "status", "createdAt"],
      "$eventId": {
        ".read": true,
        ".write": true
      }
    },
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    },
    "users": {
      "$userId": {
        ".read": true,
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

### מה זה עושה?

**`.indexOn`** - יוצר אינדקס על השדות המצוינים, מה שמשפר משמעותית את הביצועים של שאילתות:

- **ownerId** - סינון אירועים לפי בעלים (משתמש)
- **status** - סינון אירועים לפי סטטוס (active/closed)
- **createdAt** - מיון לפי תאריך יצירה

### לפני ואחרי

**❌ בלי אינדקס:**
- Firebase מוריד את **כל** האירועים לדפדפן
- הדפדפן מסנן ומיין את הנתונים (איטי!)

**✅ עם אינדקס:**
- Firebase מסנן ומיין **בשרת**
- הדפדפן מקבל רק את הנתונים הרלוונטיים (מהיר!)

### שלב 3: פרסום הכללים
1. לחץ על **Publish** (פרסם)
2. אישור: "Do you want to publish these rules?"
3. לחץ **Yes**

### אימות
אחרי הפרסום, רענן את הדשבורד - האזהרה בקונסול אמורה להיעלם.

---

## ⚠️ כללים נדרשים - עדכן מיד ב-Firebase Console!

**הבעיה:** משתמשים לא יכולים לקרוא את רשימת האירועים בדשבורד.

**הפתרון:** העתק והדבק את הכללים הבאים ב-Firebase Console:

```json
{
  "rules": {
    "events": {
      ".read": "auth != null",
      ".indexOn": ["ownerId", "status", "createdAt"],
      "$eventId": {
        ".write": "auth != null"
      }
    },
    "sessions": {
      ".indexOn": ["sessionActive", "createdAt"],
      "$sessionId": {
        ".read": true,
        ".write": true,
        "players": {
          "$playerId": {
            ".read": true,
            ".write": true
          }
        },
        "winners": {
          "$winnerId": {
            ".read": true,
            ".write": true
          }
        }
      }
    },
    "users": {
      ".read": "auth != null",
      "$userId": {
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

### ✅ השינוי החשוב:

**לפני:**
```json
"events": {
  ".indexOn": ["ownerId", "status", "createdAt"],
  "$eventId": {
    ".read": true,
    ".write": "auth != null"
  }
}
```

**אחרי:**
```json
"events": {
  ".read": "auth != null",  // ✅ קריאת רשימת אירועים למשתמשים מחוברים
  ".indexOn": ["ownerId", "status", "createdAt"],
  "$eventId": {
    ".write": "auth != null"
  }
}
```

### הסבר על הכללים:

#### `events`
- **קריאה**: רק משתמשים מחוברים (לדשבורד)
- **כתיבה**: רק משתמשים מחוברים (יצירת/עדכון אירועים)
- **אינדקסים**: ownerId, status, createdAt (לסינון ומיון בדשבורד)

#### `sessions`
- **קריאה/כתיבה**: פתוח לכולם (למשחק וזיהוי בזמן אמת)
- **אינדקסים**: sessionActive, createdAt (למעקב סטטוס)
- **שחקנים וזוכים**: פתוח לכולם (חוויית משחק ציבורית)

#### `users`
- **קריאה**: רק משתמשים מחוברים (לרשימת משתמשים בדשבורד)
- **כתיבה**: רק המשתמש עצמו יכול לעדכן את הפרופיל שלו

---

## 🚨 שלבי עדכון (בצע עכשיו!)

### 1. כניסה ל-Firebase Console
1. לך ל-[Firebase Console](https://console.firebase.google.com)
2. בחר פרויקט: **slotm-c0090**
3. לחץ על **Realtime Database** מהתפריט

### 2. עדכון כללי האבטחה
1. לחץ על טאב **Rules** (כללים)
2. **מחק את כל הכללים הקיימים**
3. **העתק והדבק** את הכללים מלמעלה (בלוק ה-JSON המלא)
4. לחץ **Publish** (פרסם)

### 3. אימות
1. רענן את דף הדשבורד
2. האירועים אמורים להיטען בהצלחה
3. בקונסול הדפדפן לא אמורות להופיע שגיאות `permission_denied`

---

## שאלות נפוצות

**ש: האם צריך לעדכן את הקוד אחרי הוספת האינדקס?**
ת: לא! האינדקס פועל אוטומטית ברקע.

**ש: מה קורה אם לא מוסיפים אינדקס?**
ת: המערכת תמשיך לעבוד, אבל יותר לאט - Firebase תוריד יותר נתונים מהשרת.

**ש: האם יש עלות לאינדקסים?**
ת: לא! האינדקסים חינמיים ומשפרים ביצועים.

---

📅 **תאריך יצירה:** 15/11/2025
🔧 **עדכון אחרון:** 15/11/2025
