// 🧹 סקריפט ניקוי - מחיקת מערכת מלאי ישנה
// הרץ פעם אחת כדי לנקות נתונים ישנים מ-localStorage

(function cleanupOldInventory() {
    console.log('🧹 מתחיל ניקוי מערכת מלאי ישנה...');

    // בדוק אם יש נתונים ישנים
    const oldInventory = localStorage.getItem('prizeInventory');
    const oldInitialInventory = localStorage.getItem('initialPrizeInventory');

    if (oldInventory || oldInitialInventory) {
        console.log('⚠️ נמצאו נתונים ישנים:');
        if (oldInventory) console.log('  - prizeInventory:', oldInventory);
        if (oldInitialInventory) console.log('  - initialPrizeInventory:', oldInitialInventory);

        // מחק את הנתונים הישנים
        localStorage.removeItem('prizeInventory');
        localStorage.removeItem('initialPrizeInventory');
        localStorage.removeItem('inventory');
        localStorage.removeItem('initialInventory');

        console.log('✅ נתונים ישנים נמחקו!');
        console.log('📝 מעתה, כל המלאי מנוהל ב-dynamicImagesManager בלבד');
    } else {
        console.log('✅ אין נתונים ישנים למחיקה');
    }

    // הצג את המלאי הנוכחי מ-dynamicImages
    const currentImages = localStorage.getItem('dynamicImages');
    if (currentImages) {
        const images = JSON.parse(currentImages);
        console.log('📦 מלאי נוכחי (dynamicImages):');
        images.forEach((img, index) => {
            const inventoryDisplay = img.inventory === null ? '∞' : img.inventory;
            const initialDisplay = img.initialInventory === null ? '∞' : img.initialInventory;
            console.log(`  ${index + 1}. ${img.prizeName || img.label}: ${inventoryDisplay}/${initialDisplay} (symbolIndex: ${img.symbolIndex})`);
        });
    } else {
        console.log('⚠️ אין נתונים ב-dynamicImages');
    }
})();
