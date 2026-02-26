/**
 * Generate raffle Excel files:
 * 1. raffle-template.xlsx - Empty template with headers
 * 2. raffle-demo.xlsx - 1000 Israeli names demo
 *
 * Run: node generate-raffle-demo.js
 */

const XLSX = require('xlsx');

// ─── Israeli First Names (common Hebrew names) ───
const firstNames = [
    'אבי', 'אברהם', 'אדם', 'אהרון', 'אופיר', 'אור', 'אורי', 'אושר', 'אייל', 'אילן',
    'אלון', 'אלי', 'אליהו', 'אמיר', 'אריאל', 'ארז', 'אשר', 'בועז', 'בן', 'בנימין',
    'גבריאל', 'גד', 'גדעון', 'גיא', 'גיל', 'גלעד', 'דוד', 'דור', 'דין', 'דניאל',
    'הראל', 'הרצל', 'זיו', 'חגי', 'חיים', 'חנן', 'טל', 'טום', 'יאיר', 'יגאל',
    'יהונתן', 'יהודה', 'יואב', 'יוגב', 'יוחאי', 'יונתן', 'יוסי', 'יוסף', 'יובל', 'יצחק',
    'ישי', 'ישראל', 'כפיר', 'לאון', 'ליאור', 'ליאם', 'לירון', 'לירז', 'מאור', 'מיכאל',
    'מנחם', 'משה', 'מתן', 'נדב', 'נהוראי', 'ניב', 'ניר', 'נעם', 'נתן', 'נתנאל',
    'סהר', 'עדי', 'עוז', 'עומר', 'עופר', 'עידן', 'עידו', 'עמית', 'עמרי', 'ערן',
    'פלג', 'צבי', 'צחי', 'קובי', 'רון', 'רועי', 'רז', 'רם', 'רפאל', 'שגיא',
    'שי', 'שחר', 'שלומי', 'שלמה', 'שמואל', 'שמעון', 'תום', 'תומר', 'תמיר',
    // Female names
    'אביגיל', 'אבישג', 'אדוה', 'אופל', 'אורית', 'אורלי', 'אילנית', 'איריס', 'אלה', 'אמילי',
    'אסתר', 'אפרת', 'אריאלה', 'בר', 'ברכה', 'גל', 'גלי', 'גלית', 'דבורה', 'דנה',
    'דנית', 'דפנה', 'הגר', 'הדס', 'הדר', 'הילה', 'הלל', 'ורד', 'זהבה', 'חגית',
    'חנה', 'טובה', 'טלי', 'יאל', 'ידידה', 'יהודית', 'יוכבד', 'יעל', 'יפה', 'יפעת',
    'ירדן', 'כרמל', 'כרמית', 'לאה', 'לי', 'ליאת', 'לימור', 'לינוי', 'ליעד', 'מאיה',
    'מור', 'מורן', 'מוריה', 'מיכל', 'מירב', 'מרים', 'נגה', 'נוגה', 'נוי', 'נועה',
    'נועם', 'נופר', 'נורית', 'סיגל', 'סיון', 'סמדר', 'עדי', 'עדינה', 'עליזה', 'ענבל',
    'ענת', 'עפרה', 'פנינה', 'צפורה', 'קרן', 'רבקה', 'רויטל', 'רונית', 'רות', 'רחל',
    'ריטה', 'רינת', 'שולמית', 'שושנה', 'שי', 'שיר', 'שירה', 'שירלי', 'שלומית', 'שני',
    'שרה', 'שרון', 'תאיר', 'תהילה', 'תמר', 'תמרה'
];

// ─── Israeli Last Names (common Hebrew family names) ───
const lastNames = [
    'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'פרידמן', 'אזולאי', 'שרביט',
    'אדרי', 'מלכה', 'דוד', 'בן דוד', 'חיים', 'עמר', 'יוסף', 'גבאי', 'בן שמעון', 'מימון',
    'שלום', 'בר', 'רוזנברג', 'קפלן', 'ברק', 'גולדשטיין', 'ויצמן', 'שפירא', 'בן חיים', 'נגר',
    'גולדברג', 'שטרן', 'ברגר', 'הלוי', 'אלון', 'ברנשטיין', 'וולף', 'רבינוביץ', 'קליין', 'פישר',
    'גרינברג', 'הורוביץ', 'שוורץ', 'לנדאו', 'ויס', 'ליבוביץ', 'שגב', 'רון', 'זהבי', 'סויסה',
    'אוחיון', 'חדד', 'טובי', 'סבג', 'אלבז', 'בנימין', 'אשכנזי', 'ספרדי', 'שמש', 'אליהו',
    'חזן', 'מרדכי', 'ישראלי', 'בראון', 'גרין', 'שמואלי', 'אבוטבול', 'סלומון', 'מרציאנו', 'בכר',
    'אמסלם', 'טל', 'אפרים', 'קדוש', 'סימן טוב', 'מגן', 'עטיה', 'אלימלך', 'אוזן', 'צדוק',
    'סרוסי', 'חמו', 'בוזגלו', 'אלקיים', 'מסעוד', 'חביב', 'ששון', 'נחמיאס', 'אופיר', 'גל',
    'נתן', 'סעדון', 'יחזקאל', 'חורי', 'נאור', 'בניון', 'אורן', 'יערי', 'שאול', 'אלמוג'
];

// ─── Phone Prefixes ───
const phonePrefixes = ['050', '052', '053', '054', '055', '058'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
    const prefix = randomItem(phonePrefixes);
    const number = String(Math.floor(1000000 + Math.random() * 9000000));
    return prefix + number;
}

function randomQuantity() {
    // 70% empty (infinite), 20% have 1-3, 10% have 4-10
    const r = Math.random();
    if (r < 0.7) return '';
    if (r < 0.9) return Math.floor(Math.random() * 3) + 1;
    return Math.floor(Math.random() * 7) + 4;
}

// ─── Generate Template ───
function generateTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([['שם', 'טלפון', 'כמות']]);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 },  // שם
        { wch: 15 },  // טלפון
        { wch: 10 }   // כמות
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'משתתפים');
    XLSX.writeFile(wb, 'raffle-template.xlsx');
    console.log('Created: raffle-template.xlsx');
}

// ─── Generate Demo (1000 Israeli Names) ───
function generateDemo() {
    const rows = [['שם', 'טלפון', 'כמות']];

    for (let i = 0; i < 1000; i++) {
        const name = randomItem(firstNames) + ' ' + randomItem(lastNames);
        const phone = randomPhone();
        const qty = randomQuantity();
        rows.push([name, phone, qty]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'משתתפים');
    XLSX.writeFile(wb, 'raffle-demo.xlsx');
    console.log('Created: raffle-demo.xlsx (1000 participants)');
}

// ─── Run ───
generateTemplate();
generateDemo();
console.log('Done!');
