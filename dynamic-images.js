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
        const newImage = {
            id: Date.now() + Math.random(), // ID ייחודי
            imageData: null, // base64 של התמונה
            inventory: null, // null = אינסוף, מספר = כמות מוגבלת
            initialInventory: null,
            label: `תמונה ${this.images.length + 1}` // תווית
        };

        this.images.push(newImage);
        console.log(`➕ נוסף תא תמונה: ${newImage.label}`);
    },

    // מחק תמונה
    removeImage(id) {
        const index = this.images.findIndex(img => img.id === id);
        if (index !== -1 && this.images.length > this.minImages) {
            this.images.splice(index, 1);
            console.log(`🗑️ תמונה נמחקה`);
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

    // הצג את כל התמונות ב-DOM
    render() {
        const container = document.getElementById('dynamic-images-container');
        if (!container) return;

        container.innerHTML = '';

        this.images.forEach((image, index) => {
            const itemDiv = this.createImageItem(image, index);
            container.appendChild(itemDiv);
        });

        console.log(`🎨 רונדר ${this.images.length} תמונות`);
    },

    // צור אלמנט תמונה בודד
    createImageItem(image, index) {
        const div = document.createElement('div');
        div.className = 'image-upload-item';
        div.setAttribute('data-image-id', image.id);

        const hasImage = image.imageData !== null;
        const inventoryValue = image.inventory === null ? '' : image.inventory;
        const inventoryDisplay = image.inventory === null ? '∞' : image.inventory;
        const distributedCount = image.initialInventory !== null && image.inventory !== null
            ? (image.initialInventory - image.inventory)
            : 0;

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
            <div class="inventory-input-wrapper">
                <label for="inventory-${image.id}">מלאי:</label>
                <input type="number"
                       id="inventory-${image.id}"
                       min="0"
                       value="${inventoryValue}"
                       placeholder="∞"
                       class="inventory-input"
                       data-image-id="${image.id}">
                <button class="reset-inventory-btn" data-image-id="${image.id}">איפוס</button>
                ${this.images.length > this.minImages ? `<button class="remove-image-btn" data-image-id="${image.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>` : ''}
            </div>
            <div class="inventory-counter" id="counter-${image.id}">
                <span class="distributed">${distributedCount}</span> / <span class="total">${inventoryDisplay}</span>
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

        // מאזין לשינוי מלאי
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('inventory-input')) {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                const value = e.target.value;
                this.updateInventory(imageId, value);
                this.render();
            }
        });

        // מאזין לאיפוס מלאי
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('reset-inventory-btn')) {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                const image = this.images.find(img => img.id === imageId);
                if (image && image.initialInventory !== null) {
                    image.inventory = image.initialInventory;
                    this.saveToStorage();
                    this.render();
                }
            }

            // מאזין למחיקת תמונה
            if (e.target.classList.contains('remove-image-btn')) {
                const imageId = parseFloat(e.target.getAttribute('data-image-id'));
                if (confirm('האם אתה בטוח שברצונך למחוק תמונה זו?')) {
                    this.removeImage(imageId);
                }
            }
        });

        // כפתור הוסף תמונה
        const addBtn = document.getElementById('add-image-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (this.images.length < this.maxImages) {
                    this.addEmptySlot();
                    this.render();
                    this.saveToStorage();
                } else {
                    alert(`ניתן להוסיף עד ${this.maxImages} תמונות`);
                }
            });
        }

        // כפתור איפוס לאימוג'י
        const resetBtn = document.getElementById('reset-images');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('האם אתה בטוח? כל התמונות יימחקו ותחזור לאימוג\'י ברירת מחדל')) {
                    this.resetToEmojis();
                }
            });
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
            console.log(`♾️ מלאי אינסופי לתמונה - לא מפחית`);
            return true; // אינסוף - תמיד זמין
        }

        if (targetImage.inventory > 0) {
            targetImage.inventory--;
            console.log(`📦 מלאי הופחת ל-${targetImage.inventory} עבור תמונה`);
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
                console.log(`📂 נטענו ${this.images.length} תמונות`);
            }
        } catch (e) {
            console.error('❌ שגיאה בטעינת תמונות:', e);
            this.images = [];
        }
    }
};

// ייצוא למודול גלובלי
window.dynamicImagesManager = dynamicImagesManager;
