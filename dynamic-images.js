// ניהול תמונות דינמי - קובץ נפרד לניהול מערכת התמונות החדשה

// מערכת ניהול תמונות דינמית
const dynamicImagesManager = {
    images: [], // מערך התמונות שהמשתמש העלה
    minImages: 2, // מינימום תמונות נדרש
    maxImages: 20, // מקסימום תמונות (ניתן לשנות)

    // אתחול המערכת
    init() {
        console.log('🖼️ מאתחל מערכת תמונות דינמית');

        // טען תמונות שמורות
        this.loadFromStorage();

        // צור תמונות ראשוניות אם אין
        if (this.images.length === 0) {
            this.addEmptySlot();
            this.addEmptySlot();
        }

        // הצג את התמונות
        this.render();

        // הגדר מאזינים
        this.setupListeners();
    },

    // הוסף תא תמונה חדש (ריק)
    addEmptySlot() {
        const prizeIndex = this.images.length;
        const newImage = {
            id: Date.now() + Math.random(), // ID ייחודי
            code: `PRIZE_${String(prizeIndex + 1).padStart(3, '0')}`, // ✅ קוד ייחודי: PRIZE_001, PRIZE_002...
            imageData: null, // base64 של התמונה
            inventory: null, // null = אינסוף, מספר = כמות מוגבלת
            initialInventory: null,
            distributedCount: 0, // ✅ NEW: מונה כמה פרסים חולקו בסה"כ
            label: `תמונה ${prizeIndex + 1}`, // תווית
            prizeName: '', // ✅ שם מותאם אישית לפרס
            symbolIndex: prizeIndex // מיקום בגלגלים
        };

        this.images.push(newImage);
        console.log(`➕ נוסף תא תמונה: ${newImage.label} (קוד: ${newImage.code})`);
    },

    // מחק תמונה
    removeImage(id) {
        const index = this.images.findIndex(img => img.id === id);
        if (index !== -1 && this.images.length > this.minImages) {
            this.images.splice(index, 1);
            console.log(`🗑️ תמונה נמחקה`);

            // ✅ CRITICAL FIX: אינדקס מחדש את symbolIndex אחרי מחיקה
            this.reindexSymbols();

            this.render();
            this.saveToStorage();
        } else if (this.images.length <= this.minImages) {
            alert(`לא ניתן למחוק! נדרשות לפחות ${this.minImages} תמונות`);
        }
    },

    // עדכן תמונה
    updateImage(id, imageData) {
        const image = this.images.find(img => img.id === id);
        if (image) {
            image.imageData = imageData;
            console.log(`✏️ תמונה עודכנה`);
            this.saveToStorage();
        }
    },

    // עדכן מלאי
    updateInventory(id, inventory) {
        const image = this.images.find(img => img.id === id);
        if (image) {
            // אם השדה ריק או null, השתמש ב-null (אינסוף)
            if (inventory === '' || inventory === null || inventory === undefined) {
                image.inventory = null;
                image.initialInventory = null;
            } else {
                const num = parseInt(inventory);
                if (!isNaN(num) && num >= 0) {
                    image.inventory = num;
                    image.initialInventory = num;
                }
            }
            console.log(`📦 מלאי עודכן:`, image.inventory === null ? 'אינסוף ♾️' : image.inventory);
            this.saveToStorage();
        }
    },

    // ✅ NEW: אינדקס מחדש את symbolIndex של כל התמונות
    reindexSymbols() {
        this.images.forEach((img, index) => {
            img.symbolIndex = index;
        });
        console.log(`🔄 symbolIndex אונדקס מחדש: ${this.images.length} תמונות (0-${this.images.length - 1})`);
    },

    // הצג את כל התמונות ב-DOM
    render() {
        const container = document.getElementById('dynamic-images-container');
        if (!container) {
            console.warn('⚠️ קונטיינר dynamic-images-container לא נמצא!');
            return;
        }

        container.innerHTML = '';

        console.log(`🎨 מתחיל רונדר עם ${this.images.length} תמונות`);

        // הצג את כל התמונות הקיימות
        this.images.forEach((image, index) => {
            const itemDiv = this.createImageItem(image, index);
            container.appendChild(itemDiv);
            console.log(`➕ הוספתי תמונה ${index + 1}`);
        });

        // הוסף תיבת "הוסף פרס" בסוף
        if (this.images.length < this.maxImages) {
            const addPrizeBox = this.createAddPrizeBox();
            container.appendChild(addPrizeBox);
            console.log(`➕ הוספתי תיבת הוספה`);
        }

        console.log(`✅ רונדר הושלם - ${this.images.length} תמונות בתוספת תיבת הוספה`);
    },

    // צור תיבת "הוסף פרס" עם פלוס
    createAddPrizeBox() {
        const div = document.createElement('div');
        div.className = 'add-prize-box';
        div.id = 'add-prize-box';

        div.innerHTML = `
            <div class="add-prize-icon">+</div>
            <p class="add-prize-text">לחצו או גררו תמונה<br>להוספת פרס</p>
        `;

        return div;
    },

    // צור אלמנט תמונה בודד
    createImageItem(image, index) {
        const div = document.createElement('div');
        div.className = 'image-upload-item';
        div.setAttribute('data-image-id', image.id);

        const hasImage = image.imageData !== null;
        const inventoryValue = image.inventory === null ? '' : image.inventory;
        const inventoryDisplay = image.inventory === null ? '∞' : image.inventory;
        const isUnlimited = image.inventory === null;
        const distributedCount = image.distributedCount || 0; // ✅ NEW: Track total distributed

        div.innerHTML = `
            <label for="image-${image.id}">
                <div class="image-preview" id="preview-${image.id}">
                    ${hasImage ? `
                        <img src="${image.imageData}" alt="${image.label}" class="uploaded-image">
                    ` : `
                        <span class="preview-icon">📷</span>
                        <span class="preview-text">${image.label}</span>
                    `}
                </div>
                <input type="file" id="image-${image.id}" accept="image/*,image/png" hidden data-image-id="${image.id}">
            </label>

            <!-- מלאי - Inventory Controls -->
            <div class="inventory-controls">
                <h4 class="inventory-header">מלאי</h4>

                <!-- Prize Name Input -->
                <div class="prize-name-input-row">
                    <label for="prize-name-${image.id}" class="prize-name-label">שם הפרס:</label>
                    <input type="text"
                           id="prize-name-${image.id}"
                           class="prize-name-input"
                           data-image-id="${image.id}"
                           value="${image.prizeName || ''}"
                           placeholder="לדוגמה: iPhone 15"
                           maxlength="30">
                </div>

                <div class="inventory-display-row">
                    <span class="inventory-label">מלאי נוכחי:</span>
                    <span class="inventory-current">${inventoryDisplay}</span>
                </div>

                <div class="inventory-input-row">
                    <input type="number"
                           id="inventory-${image.id}"
                           min="0"
                           value="${inventoryValue}"
                           placeholder="∞"
                           class="inventory-input-new"
                           data-image-id="${image.id}"
                           ${isUnlimited ? 'disabled' : ''}>
                    <button class="unlimited-toggle-btn ${isUnlimited ? 'active' : ''}"
                            data-image-id="${image.id}"
                            title="מלאי בלתי מוגבל">
                        ♾️
                    </button>
                </div>

                <div class="distributed-section">
                    <span class="distributed-label">סה״כ חולק:</span>
                    <span class="distributed-value">${distributedCount}</span>
                    <svg class="reset-distributed-icon"
                         data-image-id="${image.id}"
                         title="איפוס מונה חלוקה"
                         width="18" height="18"
                         viewBox="0 0 24 24"
                         fill="none"
                         stroke="currentColor"
                         stroke-width="2"
                         style="cursor: pointer; color: #FF9800; transition: all 0.2s ease;">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                    </svg>
                </div>

                ${this.images.length > this.minImages ? `
                <button class="remove-image-btn-new" data-image-id="${image.id}" title="מחק פרס">
                    🗑️ מחק
                </button>
                ` : ''}
            </div>
        `;

        return div;
    },

    // הגדר מאזינים לאירועים
    setupListeners() {
        const container = document.getElementById('dynamic-images-container');
        if (!container) return;

        // מאזין להעלאת תמונות
        container.addEventListener('change', (e) => {
            if (e.target.type === 'file') {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                const file = e.target.files[0];

                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.updateImage(imageId, event.target.result);
                        this.render();
                    };
                    reader.readAsDataURL(file);
                }
            }
        });

        // מאזין לשינוי מלאי (כולל input-new class)
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('inventory-input') ||
                e.target.classList.contains('inventory-input-new')) {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                const value = e.target.value;
                this.updateInventory(imageId, value);
                this.render();
            }

            // מאזין לשינוי שם פרס
            if (e.target.classList.contains('prize-name-input')) {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                const prizeName = e.target.value.trim();
                const image = this.images.find(img => img.id === imageId);
                if (image) {
                    image.prizeName = prizeName;
                    this.saveToStorage();
                    this.syncToFirebase();
                    console.log(`✏️ שם פרס עודכן: "${prizeName}" (ID: ${imageId})`);
                }
            }
        });

        // מאזין לכל הכפתורים
        container.addEventListener('click', (e) => {
            const target = e.target;
            const imageId = parseFloat(target.getAttribute('data-image-id'));

            // ✅ כפתור מלאי בלתי מוגבל
            if (target.classList.contains('unlimited-toggle-btn')) {
                const image = this.images.find(img => img.id === imageId);
                if (image) {
                    if (image.inventory === null) {
                        // עבור למצב מוגבל - הגדר ל-10
                        image.inventory = 10;
                        image.initialInventory = 10;
                    } else {
                        // עבור למצב בלתי מוגבל
                        image.inventory = null;
                        image.initialInventory = null;
                    }
                    this.saveToStorage();
                    this.render();
                }
            }

            // ✅ איפוס מונה חלוקה
            if (target.classList.contains('reset-distributed-icon') || target.closest('.reset-distributed-icon')) {
                const iconElement = target.classList.contains('reset-distributed-icon') ? target : target.closest('.reset-distributed-icon');
                const iconImageId = parseFloat(iconElement.getAttribute('data-image-id'));
                const image = this.images.find(img => img.id === iconImageId);
                if (image) {
                    if (confirm('האם לאפס את מונה החלוקה?')) {
                        image.distributedCount = 0;
                        this.saveToStorage();
                        this.render();
                    }
                }
            }

            // ✅ מחיקת תמונה (כפתור חדש)
            if (target.classList.contains('remove-image-btn-new')) {
                if (confirm('האם אתה בטוח שברצונך למחוק תמונה זו?')) {
                    this.removeImage(imageId);
                }
            }

            // ✅ תיבת "הוסף פרס"
            if (target.closest('#add-prize-box')) {
                if (this.images.length < this.maxImages) {
                    this.addEmptySlot();
                    this.render();
                    this.saveToStorage();
                } else {
                    alert(`ניתן להוסיף עד ${this.maxImages} תמונות`);
                }
            }
        });

        // ✅ כפתור טוגל פרסים פעיל/כבוי (גלובלי)
        const prizesToggle = document.getElementById('prizes-active-toggle');
        if (prizesToggle) {
            prizesToggle.addEventListener('change', (e) => {
                const isActive = e.target.checked;
                const statusText = document.getElementById('prizes-toggle-status');

                if (isActive) {
                    statusText.textContent = '✓ משתמש בתמונות פרסים';
                    console.log('🎁 פרסים פעילים');
                } else {
                    statusText.textContent = '✗ משתמש באימוג׳י ברירת מחדל';
                    console.log('😊 אימוג׳י ברירת מחדל');
                }

                // שמור הגדרה
                localStorage.setItem('prizesActive', isActive);
            });

            // טען הגדרה
            const savedState = localStorage.getItem('prizesActive');
            if (savedState !== null) {
                prizesToggle.checked = savedState === 'true';
                const statusText = document.getElementById('prizes-toggle-status');
                statusText.textContent = prizesToggle.checked
                    ? '✓ משתמש בתמונות פרסים'
                    : '✗ משתמש באימוג׳י ברירת מחדל';
            }
        }
    },

    // איפוס לאימוג'י
    resetToEmojis() {
        this.images = [];
        this.addEmptySlot();
        this.addEmptySlot();
        this.render();
        this.saveToStorage();

        // עדכן את gameState
        gameState.customSymbols = [null, null, null, null, null, null, null, null, null];
        localStorage.setItem('customSymbols', JSON.stringify(gameState.customSymbols));

        console.log('🔄 אופס לאימוג\'י ברירת מחדל');
        alert('אופס! עכשיו תשתמש באימוג\'י ברירת מחדל 🍒🍋🍊');
    },

    // קבל מערך של 9 תמונות לשימוש במשחק
    getGameSymbols() {
        console.log('🔍 getGameSymbols נקרא, this.images:', this.images.length, 'תמונות');

        // ✅ בדוק אם פרסים פעילים
        const prizesActive = localStorage.getItem('prizesActive');
        if (prizesActive === 'false') {
            console.log('😊 פרסים כבויים - משתמש באימוג׳י');
            return null;
        }

        // סנן רק תמונות שהועלו
        const uploadedImages = this.images.filter(img => img.imageData !== null);
        console.log('🔍 uploadedImages:', uploadedImages.length, 'תמונות עם imageData');

        if (uploadedImages.length === 0) {
            // אין תמונות - החזר null כדי להשתמש באימוג'י
            console.warn('⚠️ אין תמונות - מחזיר null');
            return null;
        }

        if (uploadedImages.length < 2) {
            console.warn('⚠️ פחות מ-2 תמונות הועלו');
            return null;
        }

        // שכפל את התמונות למלא 9 תאים
        const symbols = [];
        while (symbols.length < 9) {
            for (let img of uploadedImages) {
                if (symbols.length < 9) {
                    symbols.push(img.imageData);
                }
            }
        }

        console.log(`🎰 נוצרו ${symbols.length} סמלים מ-${uploadedImages.length} תמונות`);
        return symbols;
    },

    // קבל מערך מלאי לשימוש במשחק
    getInventoryArray() {
        const uploadedImages = this.images.filter(img => img.imageData !== null);

        if (uploadedImages.length === 0) {
            return [0, 0, 0, 0, 0, 0, 0, 0, 0];
        }

        // שכפל את המלאי למלא 9 תאים
        const inventory = [];
        while (inventory.length < 9) {
            for (let img of uploadedImages) {
                if (inventory.length < 9) {
                    // null = -1 (אינסוף)
                    inventory.push(img.inventory === null ? -1 : img.inventory);
                }
            }
        }

        return inventory;
    },

    // חפש את האינדקס של סמל לפי ה-URL של התמונה
    findSymbolIndexByImageUrl(imageUrl) {
        if (!imageUrl) {
            console.warn('⚠️ findSymbolIndexByImageUrl: imageUrl is empty');
            return undefined;
        }

        // נרמל את ה-URL (הסר רווחים וקווים חדשים)
        const normalizedUrl = imageUrl.trim();

        console.log(`🔍 מחפש תמונה עבור URL: ${normalizedUrl.substring(0, 80)}...`);
        console.log(`📂 יש ${this.images.length} תמונות במערך`);

        // חפש את האינדקס של התמונה במערך
        const imageIndex = this.images.findIndex((img, idx) => {
            if (!img.imageData) {
                console.log(`  [${idx}] אין imageData - מדלג`);
                return false;
            }

            const imgUrlNormalized = img.imageData.trim();
            const matches = imgUrlNormalized === normalizedUrl;

            if (!matches) {
                // הצג את 80 התווים הראשונים לדיבאג
                console.log(`  [${idx}] לא תואם: ${imgUrlNormalized.substring(0, 80)}...`);
            } else {
                console.log(`  [${idx}] ✅ תואם!`);
            }

            return matches;
        });

        if (imageIndex >= 0) {
            console.log(`✅ נמצא symbolIndex ${imageIndex}`);
            return imageIndex;
        }

        console.warn(`❌ לא נמצא symbolIndex עבור URL`);
        return undefined;
    },

    // הפחת מלאי לפי אינדקס סמל (0-8)
    decrementInventoryBySymbolIndex(symbolIndex) {
        const uploadedImages = this.images.filter(img => img.imageData !== null);

        if (uploadedImages.length === 0) {
            console.warn('⚠️ אין תמונות להפחית מהן מלאי');
            return false;
        }

        // מצא את התמונה המקורית מתוך 9 הסמלים
        const imageIndex = symbolIndex % uploadedImages.length;
        const targetImage = uploadedImages[imageIndex];

        if (!targetImage) {
            console.warn(`⚠️ לא נמצאה תמונה לאינדקס ${symbolIndex}`);
            return false;
        }

        // בדוק אם יש מלאי
        if (targetImage.inventory === null) {
            // ✅ מלאי אינסופי - רק עדכן מונה חלוקה
            if (targetImage.distributedCount === undefined) {
                targetImage.distributedCount = 0;
            }
            targetImage.distributedCount++;
            console.log(`♾️ מלאי אינסופי - מונה חלוקה: ${targetImage.distributedCount}`);
            this.saveToStorage();
            this.render();
            return true;
        }

        if (targetImage.inventory > 0) {
            targetImage.inventory--;
            // ✅ עדכן גם מונה חלוקה
            if (targetImage.distributedCount === undefined) {
                targetImage.distributedCount = 0;
            }
            targetImage.distributedCount++;
            console.log(`📦 מלאי הופחת ל-${targetImage.inventory}, סה"כ חולק: ${targetImage.distributedCount}`);
            this.saveToStorage();
            this.render(); // רענן את התצוגה
            return true;
        } else {
            console.warn(`⚠️ אין מלאי זמין לתמונה זו`);
            return false;
        }
    },

    // שמור ב-localStorage
    saveToStorage() {
        try {
            localStorage.setItem('dynamicImages', JSON.stringify(this.images));
            console.log('💾 תמונות נשמרו');
        } catch (e) {
            console.error('❌ שגיאה בשמירת תמונות:', e);
        }
    },

    // טען מ-localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('dynamicImages');
            if (saved) {
                this.images = JSON.parse(saved);
                // וודא שלכל תמונה יש קוד ייחודי (לתאימות עם גרסאות ישנות)
                this.images.forEach((img, index) => {
                    if (!img.code) {
                        img.code = `PRIZE_${String(index + 1).padStart(3, '0')}`;
                    }
                    if (img.symbolIndex === undefined) {
                        img.symbolIndex = index;
                    }
                    if (img.distributedCount === undefined) {
                        img.distributedCount = 0; // ✅ NEW: Initialize for old data
                    }
                });

                // ✅ CRITICAL FIX: אינדקס מחדש את symbolIndex כדי למנוע ערכים שגויים
                this.reindexSymbols();

                console.log(`📂 נטענו ${this.images.length} תמונות מ-localStorage`);
            }
        } catch (e) {
            console.error('❌ שגיאה בטעינת תמונות:', e);
            this.images = [];
        }
    },

    // ✅ שמור ב-Firebase (גיבוי!)
    async saveToFirebase(sessionId) {
        if (!sessionId) {
            console.warn('⚠️ אין sessionId - לא ניתן לשמור ב-Firebase');
            return;
        }

        try {
            const prizesRef = firebase.database().ref(`sessions/${sessionId}/prizes`);

            // שמור כל פרס
            const prizesData = {};
            this.images.forEach((img) => {
                if (img.imageData) { // שמור רק תמונות שהועלו
                    prizesData[img.code] = {
                        code: img.code,
                        name: img.label,
                        prizeName: img.prizeName || '', // ✅ שם מותאם אישית
                        symbol: img.imageData ? '🖼️' : '🎁', // סמל ברירת מחדל
                        imageUrl: img.imageData, // base64 או blob URL
                        inventory: img.inventory,
                        initialInventory: img.initialInventory,
                        distributedCount: img.distributedCount || 0, // ✅ NEW
                        symbolIndex: img.symbolIndex,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                }
            });

            await prizesRef.set(prizesData);
            console.log(`☁️ ${Object.keys(prizesData).length} פרסים נשמרו ב-Firebase`);
        } catch (error) {
            console.error('❌ שגיאה בשמירת פרסים ב-Firebase:', error);
        }
    },

    // ✅ טען מ-Firebase (שחזור!)
    async loadFromFirebase(sessionId) {
        if (!sessionId) {
            console.warn('⚠️ אין sessionId - לא ניתן לטעון מ-Firebase');
            return false;
        }

        try {
            const prizesRef = firebase.database().ref(`sessions/${sessionId}/prizes`);
            const snapshot = await prizesRef.once('value');
            const prizesData = snapshot.val();

            if (prizesData) {
                // המר מאובייקט למערך
                this.images = Object.values(prizesData).map(prize => ({
                    id: Date.now() + Math.random(),
                    code: prize.code,
                    imageData: prize.imageUrl,
                    inventory: prize.inventory,
                    initialInventory: prize.initialInventory,
                    distributedCount: prize.distributedCount || 0, // ✅ NEW
                    label: prize.name,
                    prizeName: prize.prizeName || '', // ✅ שם מותאם אישית
                    symbolIndex: prize.symbolIndex
                }));

                // ✅ CRITICAL FIX: אינדקס מחדש את symbolIndex כדי למנוע ערכים שגויים
                this.reindexSymbols();

                console.log(`☁️ ${this.images.length} פרסים נטענו מ-Firebase`);

                // שמור גם ב-localStorage כגיבוי מקומי
                this.saveToStorage();
                return true;
            } else {
                console.log('📭 אין פרסים שמורים ב-Firebase');
                return false;
            }
        } catch (error) {
            console.error('❌ שגיאה בטעינת פרסים מ-Firebase:', error);
            return false;
        }
    }
};

// ייצוא למודול גלובלי
window.dynamicImagesManager = dynamicImagesManager;
