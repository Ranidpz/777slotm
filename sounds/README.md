# 🎵 קבצי סאונד

תיקייה זו מיועדת לקבצי הסאונד של המשחק.

## קבצים נדרשים

הוסף את הקבצים הבאים לתיקייה זו:

1. **spin.mp3** - צליל התחלת הסיבוב
2. **win.mp3** - צליל זכיה
3. **lose.mp3** - צליל אי-זכיה

## פורמטים נתמכים

- MP3 (מומלץ)
- WAV
- OGG

## הערות

- כרגע המשחק משתמש בצלילים סינתטיים שנוצרים באמצעות Web Audio API
- אם תוסיף קבצי סאונד אמיתיים, תצטרך לעדכן את `script.js` לטעון אותם
- המשחק יעבוד גם ללא קבצי סאונד חיצוניים

## דוגמה לעדכון הקוד

```javascript
// בקובץ script.js, החלף את initSounds() ב:
function initSounds() {
    sounds.spin = new Audio('sounds/spin.mp3');
    sounds.win = new Audio('sounds/win.mp3');
    sounds.lose = new Audio('sounds/lose.mp3');
}
```

