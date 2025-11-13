// הגדרות משחק
const gameState = {
    mode: 'automatic', // automatic או manual
    isSpinning: false,
    customSymbols: [null, null, null, null, null, null, null, null, null], // 9 תמונות
    defaultSymbols: ['🍒', '🍋', '🍊', '🍉', '🍇', '⭐', '💎', '7️⃣', '🎰'],
    manualStops: [false, false, false],
    currentReel: 0,
    spinsCount: 0,
    winFrequency: 3, // זכייה כל כמה נסיונות (0 = רנדומלי לגמרי)
    totalSymbols: 9, // מספר כולל של סמלים במשחק
    soundEnabled: true, // האם צלילים מופעלים
    backgroundColor: '#667eea', // צבע הרקע ברירת מחדל
    whatsappNumber: '', // מספר WhatsApp להצגת QR code בזכייה
    customSounds: { // צלילים מותאמים אישית
        spin: null,
        win: null,
        lose: null
    },
    guaranteedWinMode: false, // מצב זכייה מובטחת
    inventory: [0, 0, 0, 0, 0, 0, 0, 0, 0], // מלאי לכל אחד מ-9 הסמלים
    initialInventory: [0, 0, 0, 0, 0, 0, 0, 0, 0], // הכמות המקורית של כל פרס
    winningSymbol: null, // הסמל הזוכה הנוכחי
    lastWinningSymbol: null, // הפרס האחרון שזכה - למניעת חזרות
    qrPopupVisible: false, // האם QR popup מוצג כרגע
    qrCustomText: 'אל תשכחו! כדי לקבל את הפרס אתם צריכים לשלוח לנו תמונה שלכם עם מסך הזכייה בוואטסאפ 📸', // טקסט מותאם למסך QR
    scrollingBannerText: '🎰 ברוכים הבאים למכונת המזל! בהצלחה! 🎰', // טקסט נגלל במסך הראשי
    scrollingBannerFontSize: 32 // גודל גופן לטקסט נגלל (בפיקסלים)
};

// אלמנטים
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];
const winOverlay = document.getElementById('win-overlay');
const settingsScreen = document.getElementById('settings-screen');

// צלילים
const sounds = {
    spin: null,
    win: null,
    lose: null
};

// יצירת אובייקטי אודיו
function initSounds() {
    // טען צלילים מותאמים אישית מ-localStorage
    loadCustomSounds();

    // נטען את קבצי הסאונד - מותאמים או ברירת מחדל
    try {
        sounds.spin = gameState.customSounds.spin ?
            new Audio(gameState.customSounds.spin) :
            new Audio('sounds/prize-wheel.mp3');

        sounds.win = gameState.customSounds.win ?
            new Audio(gameState.customSounds.win) :
            new Audio('sounds/Win.mp3');

        sounds.lose = gameState.customSounds.lose ?
            new Audio(gameState.customSounds.lose) :
            new Audio('sounds/Buzzer1.mp3');

        // הגדרת ווליום ו-preload
        sounds.spin.volume = 0.5;
        sounds.spin.preload = 'auto';
        sounds.win.volume = 0.7;
        sounds.win.preload = 'auto';
        sounds.lose.volume = 0.5;
        sounds.lose.preload = 'auto';

        // Event listeners לטיפול בשגיאות
        Object.keys(sounds).forEach(key => {
            if (sounds[key] instanceof Audio) {
                sounds[key].addEventListener('error', (e) => {
                    console.log(`⚠️ שגיאה בטעינת צליל ${key}:`, e);
                });
            }
        });
    } catch (e) {
        console.log('⚠️ לא ניתן לטעון קבצי סאונד, משתמש בצלילים סינתטיים');
        // אם הטעינה נכשלה, נשתמש בצלילים סינתטיים
        sounds.spin = createSyntheticSound('spin');
        sounds.win = createSyntheticSound('win');
        sounds.lose = createSyntheticSound('lose');
    }
}

// טען צלילים מותאמים מ-localStorage
function loadCustomSounds() {
    try {
        const savedSounds = localStorage.getItem('customSounds');
        if (savedSounds) {
            gameState.customSounds = JSON.parse(savedSounds);
            console.log('🔊 צלילים מותאמים נטענו');
        }
    } catch (e) {
        console.error('שגיאה בטעינת צלילים מותאמים:', e);
    }
}

// שמור צלילים מותאמים ב-localStorage
function saveCustomSounds() {
    try {
        localStorage.setItem('customSounds', JSON.stringify(gameState.customSounds));
        console.log('💾 צלילים מותאמים נשמרו');
    } catch (e) {
        console.error('שגיאה בשמירת צלילים מותאמים:', e);
    }
}

// פונקציה להפעלת צליל בבטחה
function playSound(soundName) {
    if (!gameState.soundEnabled) return;

    try {
        const sound = sounds[soundName];
        if (sound && sound.play) {
            // אם זה אובייקט Audio רגיל
            if (sound instanceof Audio) {
                // עצור את הצליל הנוכחי אם הוא מתנגן
                sound.pause();
                sound.currentTime = 0; // אתחל מההתחלה

                // נסה להפעיל את הצליל
                const playPromise = sound.play();

                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.log(`לא ניתן להפעיל צליל ${soundName}:`, e.message);
                    });
                }
            } else {
                // צליל סינתטי
                sound.play();
            }
        }
    } catch (e) {
        console.log(`שגיאה בהפעלת צליל ${soundName}:`, e.message);
    }
}

// יצירת צליל סינתטי
function createSyntheticSound(type) {
    return {
        play: () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'spin') {
                oscillator.frequency.value = 200;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
            } else if (type === 'win') {
                // מנגינת זכיה
                const frequencies = [523, 659, 784, 1047];
                frequencies.forEach((freq, i) => {
                    setTimeout(() => {
                        const osc = audioContext.createOscillator();
                        const gain = audioContext.createGain();
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.value = freq;
                        osc.type = 'square';
                        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                        osc.start();
                        osc.stop(audioContext.currentTime + 0.2);
                    }, i * 100);
                });
            } else if (type === 'lose') {
                oscillator.frequency.value = 150;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        }
    };
}

// אתחול הגלילים
function initReels() {
    // קבל סמלים מהמערכת הדינמית החדשה
    let allSymbols;

    if (window.dynamicImagesManager) {
        const customSymbols = dynamicImagesManager.getGameSymbols();
        console.log('🔍 getGameSymbols החזיר:', customSymbols);

        if (customSymbols && customSymbols.length >= 2) {
            // יש תמונות מותאמות - השתמש רק בהן (ללא אימוג'י!)
            allSymbols = customSymbols;
            console.log('🖼️ משתמש בתמונות מותאמות בלבד (ללא אימוג\'י)', allSymbols.length, 'תמונות');
        } else {
            // אין תמונות מותאמות - השתמש רק באימוג'י
            allSymbols = [...gameState.defaultSymbols];
            console.log('😀 משתמש באימוג\'י ברירת מחדל בלבד (ללא תמונות)');
        }
    } else {
        // fallback - אם אין מנהל תמונות
        allSymbols = [...gameState.defaultSymbols];
        console.warn('⚠️ מנהל תמונות לא נטען, משתמש באימוג\'י');
    }
    
    // צור מערך בסיסי של סמלים שיהיה זהה לכל הגלילים
    const baseSymbols = [];
    for (let i = 0; i < 100; i++) {
        const symbolIndex = i % allSymbols.length;
        baseSymbols.push(allSymbols[symbolIndex]);
    }
    
    reels.forEach((reel, reelIndex) => {
        let symbolsHTML = '';
        
        // כל גליל מתחיל מהיסט שונה כדי שייראה אחרת, אבל הסדר זהה
        const offset = reelIndex * 2; // כל גליל מוסט ב-2 סמלים
        
        for (let i = 0; i < 100; i++) {
            const symbolIndex = (i + offset) % baseSymbols.length;
            const symbol = baseSymbols[symbolIndex];
            
            // בדוק אם זה URL של תמונה (מתחיל ב-data: או http)
            const isImage = typeof symbol === 'string' && (symbol.startsWith('data:') || symbol.startsWith('http'));
            
            if (isImage) {
                symbolsHTML += `<div class="symbol custom-image" style="background-image: url('${symbol}')"></div>`;
            } else {
                symbolsHTML += `<div class="symbol">${symbol}</div>`;
            }
        }
        
        reel.innerHTML = symbolsHTML;
        
        // הצב את הגליל במרכז
        reel.style.transform = 'translateY(0)';
    });
    
    // עדכן את מספר הסמלים הזמינים למשחק
    gameState.totalSymbols = allSymbols.length;
}

// התחל סיבוב
function startSpin() {
    if (gameState.isSpinning) return;
    
    gameState.isSpinning = true;
    gameState.manualStops = [false, false, false];
    gameState.currentReel = 0;
    gameState.spinsCount++;
    
    playSound('spin');
    
    // קבע אם זה צריך להיות סיבוב זוכה
    const shouldWin = determineWin();
    
    // התחל סיבוב כל הגלילים **יחד** עם kick מיידי
    reels.forEach((reel) => {
        reel.classList.remove('spinning');
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
    });
    
    // kick מיידי - תנו לגלילים קצת תאוצה ראשונית
    setTimeout(() => {
        reels.forEach(reel => {
            reel.style.transition = 'transform 0.1s ease-out';
            reel.style.transform = 'translateY(-50px)';
        });
    }, 10);
    
    // ואז הוסף את מחלקת הסיבוב המלא
    setTimeout(() => {
        reels.forEach(reel => {
            reel.style.transition = 'none';
            reel.classList.add('spinning');
        });
    }, 120);
    
    if (gameState.mode === 'automatic') {
        // במצב אוטומטי - עצור את הגלילים אחד אחד עם האטה טבעית
        setTimeout(() => stopReelSmooth(0, shouldWin), 2000);
        setTimeout(() => stopReelSmooth(1, shouldWin), 3000);
        setTimeout(() => stopReelSmooth(2, shouldWin), 4000);
    }
}

// ===== פונקציות עזר למנגנון זכיות =====

// פונקציה לזיהוי האם משתמשים בתמונות מותאמות או באימוג'ים
function isUsingCustomImages() {
    if (!window.dynamicImagesManager) return false;

    const uploadedImages = dynamicImagesManager.images.filter(
        img => img.imageData !== null
    );

    // נחשיב שמשתמשים בתמונות רק אם יש לפחות 2 תמונות מועלות
    return uploadedImages.length >= 2;
}

// פונקציה לבדוק אם יש פרסים זמינים (מלאי או אימוג'ים)
function hasAvailableInventory() {
    if (!isUsingCustomImages()) {
        // אימוג'ים - תמיד זמינים ללא הגבלה
        return true;
    }

    // תמונות מותאמות - בדוק אם יש לפחות תמונה אחת עם מלאי זמין
    return dynamicImagesManager.images.some(
        img => img.imageData !== null &&
               (img.inventory === null || img.inventory > 0)
    );
}

// ===== סוף פונקציות עזר =====

// קבע אם זה צריך להיות סיבוב זוכה - אלגוריתם משופר
function determineWin() {
    // אם מצב זכייה מובטחת פעיל - תמיד זוכה!
    if (gameState.guaranteedWinMode) {
        console.log(`🎰 סיבוב מספר: ${gameState.spinsCount} (מצב זכייה מובטחת)`);

        // בדוק אם יש פרסים זמינים (אימוג'ים או תמונות עם מלאי)
        if (hasAvailableInventory()) {
            const mode = isUsingCustomImages() ? 'תמונות מותאמות' : 'אימוג\'ים';
            console.log(`✅ זכייה מובטחת! (${mode})`);
            return true;
        } else {
            console.log('🚫 כל הפרסים אזלו מהמלאי - הזכייה בוטלה!');
            return false;
        }
    }

    if (gameState.winFrequency === 0) {
        // רנדומלי לגמרי
        const randomWin = Math.random() < 0.2; // 20% סיכוי לזכייה
        console.log(`🎰 סיבוב מספר: ${gameState.spinsCount} (מצב רנדומלי)`);
        console.log(`${randomWin ? '✅ זכייה רנדומלית!' : '⏳ סיבוב רגיל'}`);
        return randomWin;
    }

    // זכייה מובטחת כל X סיבובים
    const guaranteedWin = (gameState.spinsCount % gameState.winFrequency) === 0;

    // בנוסף, תמיד יש סיכוי רנדומלי קטן לזכות (10%)
    const randomBonus = Math.random() < 0.1;

    const shouldWin = guaranteedWin || randomBonus;

    console.log(`🎰 סיבוב מספר: ${gameState.spinsCount}`);
    console.log(`📊 תדירות זכייה: כל ${gameState.winFrequency} סיבובים`);
    if (guaranteedWin) {
        console.log('✅ זכייה מובטחת לפי תדירות!');
    } else if (randomBonus) {
        console.log('🎲 זכייה בונוס רנדומלית!');
    } else {
        console.log('⏳ סיבוב רגיל');
    }

    return shouldWin;
}

// עצור גלגל בצורה חלקה וטבעית
function stopReelSmooth(reelIndex, shouldWin = false) {
    const reel = reels[reelIndex];
    const symbolHeight = window.innerHeight / 3;
    const numSymbols = gameState.totalSymbols || 9;

    // קבע את הסמל היעד - זה האינדקס בתוך מערך הסמלים (0-8)
    let targetSymbolIndex;

    if (shouldWin) {
        // במצב זכייה - כל הגלילים צריכים לעצור על אותו סמל
        if (reelIndex === 0) {
            // הגליל הראשון בוחר סמל - בהתאם למצב
            if (gameState.guaranteedWinMode) {
                // במצב זכייה מובטחת - בחר סמל לפי סוג המשחק

                if (isUsingCustomImages()) {
                    // תמונות מותאמות - בחר רק מתמונות עם מלאי זמין
                    const availableSymbols = [];

                    dynamicImagesManager.images.forEach((img, idx) => {
                        if (img.imageData !== null && (img.inventory === null || img.inventory > 0)) {
                            availableSymbols.push(idx);
                        }
                    });

                    if (availableSymbols.length > 0) {
                        // נסה למנוע בחירה של אותו פרס פעמיים ברצף
                        let selectedSymbol;

                        if (availableSymbols.length > 1 && gameState.lastWinningSymbol !== null) {
                            const otherSymbols = availableSymbols.filter(s => s !== gameState.lastWinningSymbol);

                            if (otherSymbols.length > 0) {
                                selectedSymbol = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
                                console.log(`🎲 תמונה מותאמת - נמנע מחזרה על פרס ${gameState.lastWinningSymbol}, נבחר ${selectedSymbol}`);
                            } else {
                                selectedSymbol = availableSymbols[0];
                            }
                        } else {
                            selectedSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
                        }

                        gameState.winningSymbol = selectedSymbol;
                        const inventory = dynamicImagesManager.images[selectedSymbol].inventory;
                        const inventoryText = inventory === null ? 'אינסוף' : inventory;
                        console.log(`🎯 תמונה ${gameState.winningSymbol} נבחרה (מלאי: ${inventoryText})`);
                    } else {
                        // לא אמור להגיע לכאן בגלל התיקון ב-determineWin
                        gameState.winningSymbol = Math.floor(Math.random() * numSymbols);
                        console.error('❌ שגיאה: אין מלאי אבל shouldWin=true');
                    }
                } else {
                    // אימוג'ים - בחר רנדומלי מכל הסמלים (אין הגבלת מלאי)
                    gameState.winningSymbol = Math.floor(Math.random() * numSymbols);
                    console.log(`🎯 אימוג'י ${gameState.winningSymbol} נבחר (ללא הגבלת מלאי)`);
                }
            } else {
                // מצב רגיל - בחר סמל רנדומלי
                gameState.winningSymbol = Math.floor(Math.random() * numSymbols);
                console.log(`🎯 גליל 1 נבחר לעצור על סמל מספר: ${gameState.winningSymbol}`);
            }
            targetSymbolIndex = gameState.winningSymbol;
        } else {
            // שאר הגלילים עוצרים על אותו סמל
            targetSymbolIndex = gameState.winningSymbol;
            console.log(`🎯 גליל ${reelIndex + 1} יעצור על סמל מספר: ${targetSymbolIndex}`);
        }
    } else {
        // במצב רגיל - נסה למנוע זכייה מקרית
        targetSymbolIndex = Math.floor(Math.random() * numSymbols);
        
        // אם זה לא הגליל הראשון, נסה למנוע התאמה (90% מהזמן)
        if (reelIndex > 0 && gameState.firstSymbol !== undefined) {
            let attempts = 0;
            while (targetSymbolIndex === gameState.firstSymbol && attempts < 10 && Math.random() > 0.1) {
                targetSymbolIndex = Math.floor(Math.random() * numSymbols);
                attempts++;
            }
        }
        
        console.log(`⏳ גליל ${reelIndex + 1} יעצור על סמל מספר: ${targetSymbolIndex}`);
    }
    
    // שמור את הסמל הראשון לצורך מניעת זכיות מקריות
    if (reelIndex === 0) {
        gameState.firstSymbol = targetSymbolIndex;
    }
    
    // עצור את האנימציה האינסופית
    reel.classList.remove('spinning');
    
    // קבל את המיקום הנוכחי
    const currentTransform = window.getComputedStyle(reel).transform;
    const matrix = new DOMMatrix(currentTransform);
    const currentY = matrix.m42 || 0;
    
    // חשב את המיקום היעד - תוך התחשבות בהיסט של הגליל
    const reelOffset = reelIndex * 2; // כל גליל מתחיל עם היסט של 2 סמלים
    const basePosition = 30; // מיקום בסיסי באמצע מערך הסמלים (מתוך 100)
    
    // כל גליל נוצר כך: symbol[i] = allSymbols[(i + reelOffset) % numSymbols]
    // אז כדי למצוא את המיקום שבו נמצא targetSymbolIndex:
    // (i + reelOffset) % numSymbols = targetSymbolIndex
    // i = (targetSymbolIndex - reelOffset + numSymbols) % numSymbols + k*numSymbols
    
    // נמצא את המופע הקרוב ביותר ל-basePosition
    const targetPosition = (targetSymbolIndex - reelOffset + numSymbols) % numSymbols;
    
    // מצא את המופע של הסמל הזה שהכי קרוב ל-basePosition
    const cycleNumber = Math.floor(basePosition / numSymbols);
    let symbolPosition = cycleNumber * numSymbols + targetPosition;
    
    // אם זה מחוץ לטווח, קח את המחזור הקודם או הבא
    if (symbolPosition < 0) {
        symbolPosition += numSymbols;
    } else if (symbolPosition >= 100) {
        symbolPosition -= numSymbols;
    }
    
    console.log(`📍 גליל ${reelIndex + 1}: targetSymbol=${targetSymbolIndex}, offset=${reelOffset}, targetPos=${targetPosition}, finalPos=${symbolPosition}`);
    
    // המיקום הסופי כדי שהסמל יהיה ממורכז במסך
    // צריך שהסמל יהיה בגובה של שליש אחד מהמסך (במרכז)
    const finalY = -(symbolPosition * symbolHeight) + symbolHeight;
    
    // כמה עוד לסובב - 2-3 סיבובים מלאים
    const extraSpins = Math.floor(Math.random() * 2 + 2);
    const fullSpins = extraSpins * numSymbols * symbolHeight;
    
    // חשב את המרחק הכולל שצריך לעבור
    const totalDistance = Math.abs(currentY) + fullSpins;
    const absoluteFinalY = -totalDistance + (totalDistance % (numSymbols * symbolHeight)) + finalY;
    
    // קבע את המיקום הנוכחי בדיוק
    reel.style.transition = 'none';
    reel.style.transform = `translateY(${currentY}px)`;
    
    // אחרי רגע קצר, התחל את ההאטה למיקום הסופי
    setTimeout(() => {
        // שלב 1: האטה והגעה למיקום (עובר קצת מעבר)
        const overshoot = symbolHeight * 0.3; // עובר 30% מסמל אחד
        reel.style.transition = 'transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        reel.style.transform = `translateY(${finalY - overshoot}px)`;
        
        // שלב 2: bounce אחורה למיקום המדויק
        setTimeout(() => {
            reel.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            reel.style.transform = `translateY(${finalY}px)`;
        }, 1500);
    }, 50);
    
    gameState.manualStops[reelIndex] = true;
    
    // בדוק אם כל הגלילים נעצרו
    if (gameState.manualStops.every(stopped => stopped)) {
        setTimeout(() => checkWin(), 2000);
    }
}

// בדוק זכיה
function checkWin() {
    gameState.isSpinning = false;

    const symbolHeight = window.innerHeight / 3;

    // קבל את הסמלים המרכזיים המוצגים - שורה אמצעית בלבד
    const displayedSymbols = reels.map((reel, index) => {
        const transform = reel.style.transform;
        const translateY = parseFloat(transform.match(/-?\d+\.?\d*/)?.[0] || 0);

        // חשב איזה סמל נמצא במרכז המסך
        // המיקום הנוכחי חלקי גובה הסמל, ועוד 1 כי הסמל המרכזי נמצא במיקום השני
        const offset = Math.abs(translateY) / symbolHeight;
        const centerIndex = Math.round(offset) + 1;

        // קבל את כל הסמלים בגליל
        const allSymbols = reel.querySelectorAll('.symbol');
        const symbolElement = allSymbols[centerIndex];

        // Debug - הצג מה נמצא בכל מיקום
        console.log(`גליל ${index + 1}: translateY=${translateY}, offset=${offset}, centerIndex=${centerIndex}`);

        // בדוק אם זה סמל תמונה או טקסט
        if (symbolElement?.classList.contains('custom-image')) {
            // תמונה - החזר את ה-URL מה-background-image
            const bgImage = symbolElement.style.backgroundImage;
            // נקה מ-url() ומ-quotes
            return bgImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        } else {
            // סמל טקסט רגיל
            return symbolElement?.textContent;
        }
    });

    // הצג את הסמלים שנבדקים
    console.log('🎰 סמלים במרכז:', displayedSymbols);

    // בדוק אם כל הסמלים זהים
    const isWin = displayedSymbols[0] &&
                  displayedSymbols[0] === displayedSymbols[1] &&
                  displayedSymbols[1] === displayedSymbols[2];

    if (isWin) {
        console.log(`🎉 ניצחון! כל 3 הסמלים זהים: ${displayedSymbols[0]}`);

        // זהה את הסמל שזכה - תמיד צריך להפחית מהמלאי
        let symbolIndex = gameState.winningSymbol;

        // אם winningSymbol לא מוגדר, זהה לפי התמונה/טקסט המוצג
        if (symbolIndex === undefined) {
            const winningSymbolDisplay = displayedSymbols[0];

            // אם זה תמונה (URL), חפש אותה במערכת התמונות הדינמיות
            if (window.dynamicImagesManager && winningSymbolDisplay && winningSymbolDisplay.includes('blob:')) {
                symbolIndex = dynamicImagesManager.findSymbolIndexByImageUrl(winningSymbolDisplay);
                console.log(`🔍 זוהה סמל ${symbolIndex} לפי URL התמונה`);
            }
        }

        // אם עדיין לא זוהה, נסה לפי הסמל הטקסטואלי
        if (symbolIndex === undefined) {
            const symbols = gameState.defaultSymbols;
            symbolIndex = symbols.indexOf(displayedSymbols[0]);
            if (symbolIndex >= 0) {
                console.log(`🔍 זוהה סמל ${symbolIndex} לפי אימוג'י טקסט`);
            }
        }

        // עדכן מלאי ושלח הודעה לשלט מרחוק עם פרטי הפרס
        if (symbolIndex !== undefined && symbolIndex >= 0) {
            // עדכן את הפרס האחרון שזכה (למניעת חזרות)
            gameState.lastWinningSymbol = symbolIndex;

            // הכן פרטי פרס לשלט מרחוק
            let prizeDetails = {
                symbolIndex: symbolIndex,
                symbolDisplay: displayedSymbols[0]
            };

            // עדכן מלאי לפי סוג המשחק
            if (isUsingCustomImages() && window.dynamicImagesManager) {
                // תמונות מותאמות - עדכן דרך dynamicImagesManager
                const img = dynamicImagesManager.images[symbolIndex];
                if (img && img.imageData !== null) {
                    dynamicImagesManager.decrementInventoryBySymbolIndex(symbolIndex);
                    const remaining = img.inventory === null ? 'אינסוף' : img.inventory;
                    console.log(`📦 מלאי תמונה ${symbolIndex} הופחת. נותר: ${remaining}`);

                    prizeDetails.prizeName = img.label || `תמונה ${symbolIndex + 1}`;
                    prizeDetails.remainingInventory = remaining;
                }
            } else {
                // אימוג'ים - אין צורך בעדכון מלאי
                console.log(`🎯 זכייה באימוג'י ${symbolIndex} (ללא הגבלת מלאי)`);
                prizeDetails.prizeName = displayedSymbols[0];
                prizeDetails.remainingInventory = 'אינסוף';
            }

            // שלח הודעה לשלט מרחוק עם פרטי הפרס
            if (window.sessionManager) {
                sessionManager.storeSpinResult(true, prizeDetails);
                console.log(`📡 נשלח לשלט מרחוק: זכייה בפרס ${prizeDetails.prizeName}`);
            }
        } else {
            console.warn(`⚠️ לא הצלחנו לזהות את הסמל שזכה: ${displayedSymbols[0]}`);

            // שלח הודעת זכייה כללית גם אם לא זיהינו את הסמל
            if (window.sessionManager) {
                sessionManager.storeSpinResult(true, { symbolDisplay: displayedSymbols[0] });
            }
        }

        playSound('win');
        winOverlay.classList.remove('hidden');
        winOverlay.classList.add('flashing');

        setTimeout(() => {
            winOverlay.classList.remove('flashing');
            winOverlay.classList.add('hidden');

            // הצג QR code אם יש מספר WhatsApp
            showQRCodeIfNeeded();
        }, 1500);
    } else {
        // שלח הודעת הפסד לשלט מרחוק
        if (window.sessionManager) {
            sessionManager.storeSpinResult(false, null);
        }

        playSound('lose');
        console.log(`❌ לא זכייה. הסמלים: [${displayedSymbols[0]}] [${displayedSymbols[1]}] [${displayedSymbols[2]}]`);
    }

    // נקה את הסמל הראשון
    delete gameState.firstSymbol;
    delete gameState.winningSymbol;
}

// הצג QR code אם הוגדר מספר WhatsApp
function showQRCodeIfNeeded() {
    // עדכן את הודעת הזכייה עם שם השחקן (אם יש שחקן מרחוק פעיל)
    const winMessage = document.getElementById('win-message');
    if (winMessage && window.sessionManager) {
        // קבל את השם מה-currentSpinPlayerId אם קיים
        const playerId = sessionManager.currentSpinPlayerId;

        // בדוק אם הסיבוב הנוכחי באמת התחיל על ידי שחקן מרחוק
        // אם השחקן לא בסטטוס 'active', זה אומר שהסיבוב היה אנונימי
        if (playerId) {
            firebase.database().ref(`sessions/${sessionManager.sessionId}/players/${playerId}`).once('value').then(snapshot => {
                const player = snapshot.val();
                // רק אם השחקן קיים וב-status 'active' או 'played', הצג את השם
                if (player && player.name && (player.status === 'active' || player.status === 'played')) {
                    const playerName = player.name;
                    // הצג את השם בירוק דולק כמו הטיימר
                    winMessage.innerHTML = `🎉 מזל טוב <span style="color: #4ade80; text-shadow: 0 0 20px #4ade80, 0 0 30px #4ade80; font-weight: bold;">${playerName}</span>! זכית! 🎉`;
                    console.log(`🏆 עדכון הודעת זכייה עם שם: ${playerName}`);
                } else {
                    // שחקן לא פעיל (timeout/finished/etc) - אפס להודעה רגילה
                    winMessage.innerHTML = '🎉 מזל טוב! זכית! 🎉';
                    console.log('💭 שחקן לא פעיל - אופסה הודעת זכייה לדיפולט');
                }
            }).catch(error => {
                console.error('❌ Error fetching player from Firebase:', error);
            });
        } else {
            // אין שחקן מרחוק - אפס להודעה דיפולטיבית
            winMessage.innerHTML = '🎉 מזל טוב! זכית! 🎉';
            console.log('💭 אין שחקן מרחוק פעיל - אופסה הודעת זכייה לדיפולט');
        }
    }

    const whatsappNumber = gameState.whatsappNumber.trim();

    if (!whatsappNumber) {
        console.log('💬 לא הוגדר מספר WhatsApp - מדלג על QR code');
        return;
    }

    console.log('📱 מציג QR code למספר WhatsApp:', whatsappNumber);

    // יצור הודעת WhatsApp
    const message = encodeURIComponent('היי! זכיתי במכונת המזל! 🎰🎉');
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${message}`;

    // יצור QR code באמצעות API
    generateQRCode(whatsappURL);
}

// יצירת QR code
function generateQRCode(url) {
    const qrPopup = document.getElementById('qr-popup');
    const qrContainer = document.getElementById('qr-code-container');

    if (!qrPopup || !qrContainer) {
        console.error('❌ לא נמצאו אלמנטי QR popup');
        return;
    }

    // נקה תוכן קודם
    qrContainer.innerHTML = '';

    // צור QR code באמצעות API חיצוני
    const qrSize = 300;
    const qrImage = document.createElement('img');
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}`;
    qrImage.alt = 'QR Code for WhatsApp';
    qrImage.style.maxWidth = '100%';
    qrImage.style.height = 'auto';

    qrContainer.appendChild(qrImage);

    // הצג את ה-popup
    qrPopup.classList.remove('hidden');

    // עדכן את ה-flag שה-QR מוצג
    gameState.qrPopupVisible = true;

    // עדכן את הטקסט המותאם
    updateQRCustomMessage();

    console.log('✅ QR code נוצר והוצג בהצלחה - לחץ כדי להמשיך');
}

// עדכון הטקסט המותאם במסך QR
function updateQRCustomMessage() {
    const customMessageDiv = document.getElementById('qr-custom-message');
    if (customMessageDiv && gameState.qrCustomText) {
        const paragraph = customMessageDiv.querySelector('p');
        if (paragraph) {
            paragraph.textContent = gameState.qrCustomText;
        }
    }
}

// סגירת QR popup
function closeQRPopup() {
    const qrPopup = document.getElementById('qr-popup');
    if (qrPopup) {
        qrPopup.classList.add('hidden');
        gameState.qrPopupVisible = false;
        console.log('🔒 QR popup נסגר - מוכן למשחק הבא');
    }
}

// פונקציה להפעלת המכונה
function triggerSpin(fromRemotePlayer = false) {
    // אם QR popup מוצג, סגור אותו במקום להתחיל סיבוב חדש
    if (gameState.qrPopupVisible) {
        closeQRPopup();
        return;
    }

    // נקה את currentSpinPlayerId רק אם זה סיבוב אנונימי (לא מרחוק)
    if (!fromRemotePlayer && window.sessionManager) {
        sessionManager.currentSpinPlayerId = null;
        console.log('🎰 סיבוב אנונימי - currentSpinPlayerId נוקה');
    } else if (fromRemotePlayer) {
        console.log('🎮 סיבוב משחקן מרחוק - שומר currentSpinPlayerId');
    }

    if (gameState.mode === 'automatic') {
        startSpin();
    } else if (gameState.mode === 'manual') {
        if (!gameState.isSpinning) {
            // התחל סיבוב ידני
            gameState.isSpinning = true;
            gameState.manualStops = [false, false, false];
            gameState.currentReel = 0;
            gameState.spinsCount++;
            
            playSound('spin');
            
            // קבע אם זה צריך להיות סיבוב זוכה
            gameState.shouldWinManual = determineWin();
            
            // התחל סיבוב כל הגלילים **יחד** עם kick מיידי
            reels.forEach((reel) => {
                reel.classList.remove('spinning');
                reel.style.transition = 'none';
                reel.style.transform = 'translateY(0)';
            });
            
            // kick מיידי
            setTimeout(() => {
                reels.forEach(reel => {
                    reel.style.transition = 'transform 0.1s ease-out';
                    reel.style.transform = 'translateY(-50px)';
                });
            }, 10);
            
            // הוסף את מחלקת הסיבוב המלא
            setTimeout(() => {
                reels.forEach(reel => {
                    reel.style.transition = 'none';
                    reel.classList.add('spinning');
                });
            }, 120);
        } else {
            // עצור את הגלגל הבא עם האטה חלקה
            if (gameState.currentReel < 3 && !gameState.manualStops[gameState.currentReel]) {
                stopReelSmooth(gameState.currentReel, gameState.shouldWinManual);
                gameState.currentReel++;
            }
        }
    }
}

// טיפול במקלדת
document.addEventListener('keydown', (e) => {
    // Enter - התחל סיבוב
    if (e.key === 'Enter') {
        triggerSpin();
    }
    
    // ד או S - פתח הגדרות
    if (e.key === 'ד' || e.key === 's' || e.key === 'S') {
        if (!gameState.isSpinning) {
            openSettings();
        }
    }
    
    // Escape - סגור הגדרות
    if (e.key === 'Escape') {
        settingsScreen.classList.add('hidden');
    }
});

// טיפול בלחיצת עכבר ונגיעה במסך
const slotMachine = document.getElementById('slot-machine');

slotMachine.addEventListener('click', (e) => {
    // אל תפעיל אם לוחצים על מסך ההגדרות
    if (!settingsScreen.classList.contains('hidden')) {
        return;
    }
    triggerSpin();
});

// תמיכה במסך מגע
slotMachine.addEventListener('touchstart', (e) => {
    // אל תפעיל אם לוחצים על מסך ההגדרות
    if (!settingsScreen.classList.contains('hidden')) {
        return;
    }
    e.preventDefault(); // מנע התנהגות ברירת מחדל
    triggerSpin();
}, { passive: false });

// הגדרות
document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.mode = e.target.value;
    });
});

// סליידר תדירות זכיות
const winFrequencySlider = document.getElementById('win-frequency');
const winFrequencyValue = document.getElementById('win-frequency-value');
const winFrequencyText = document.getElementById('win-frequency-text');

winFrequencySlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    gameState.winFrequency = value;
    winFrequencyValue.textContent = value;
    
    if (value === 0) {
        winFrequencyText.textContent = 'רנדומלי לגמרי';
        document.querySelector('.setting-note').textContent = 'ערך נוכחי: רנדומלי לגמרי (ללא זכיות מובטחות)';
    } else {
        winFrequencyText.textContent = value;
        document.querySelector('.setting-note').textContent = `ערך נוכחי: זכייה כל ${value} נסיונות`;
    }
});

// יצירת עותק של ההגדרות הנוכחיות בפתיחת מסך ההגדרות
let tempSettings = {
    winFrequency: gameState.winFrequency,
    soundEnabled: gameState.soundEnabled,
    mode: gameState.mode,
    backgroundColor: gameState.backgroundColor,
    guaranteedWinMode: gameState.guaranteedWinMode,
    inventory: [...gameState.inventory],
    initialInventory: [...gameState.initialInventory],
    whatsappNumber: gameState.whatsappNumber
};

// לוח זוכים
document.getElementById('scoreboard-btn').addEventListener('click', () => {
    window.open('scoreboard.html', '_blank');
});

// שמירת הגדרות
document.getElementById('save-settings').addEventListener('click', () => {
    // שמור את כל ההגדרות ב-localStorage
    localStorage.setItem('winFrequency', gameState.winFrequency);
    localStorage.setItem('soundEnabled', gameState.soundEnabled);
    localStorage.setItem('gameMode', gameState.mode);
    localStorage.setItem('guaranteedWinMode', gameState.guaranteedWinMode);

    if (gameState.backgroundColor) {
        localStorage.setItem('backgroundColor', gameState.backgroundColor);
    }

    // שמור מספר WhatsApp
    if (gameState.whatsappNumber) {
        localStorage.setItem('whatsappNumber', gameState.whatsappNumber);
        console.log('📱 מספר WhatsApp נשמר:', gameState.whatsappNumber);
    }

    // שמור גם את הצלילים המותאמים
    saveCustomSounds();

    // שמור מלאי
    saveInventory();

    console.log('✅ ההגדרות נשמרו בהצלחה!');

    // רענן את הגלגלים עם התמונות החדשות
    initReels();
    console.log('🔄 גלגלים אותחלו מחדש עם התמונות החדשות');

    // החל את צבע הרקע המעודכן
    if (gameState.backgroundColor) {
        applyBackgroundColor(gameState.backgroundColor);
        console.log('🎨 צבע רקע הוחל:', gameState.backgroundColor);
    }

    // סגור את מסך ההגדרות
    settingsScreen.classList.add('hidden');
});

// סגירה בלי שמירה - כפתור X
document.getElementById('close-settings-x').addEventListener('click', () => {
    // החזר את ההגדרות הקודמות
    gameState.winFrequency = tempSettings.winFrequency;
    gameState.soundEnabled = tempSettings.soundEnabled;
    gameState.mode = tempSettings.mode;
    gameState.guaranteedWinMode = tempSettings.guaranteedWinMode;
    gameState.inventory = [...tempSettings.inventory];
    gameState.initialInventory = [...tempSettings.initialInventory];
    gameState.whatsappNumber = tempSettings.whatsappNumber;

    // עדכן את האלמנטים בממשק
    const winFreqSlider = document.getElementById('win-frequency');
    const winFreqValue = document.getElementById('win-frequency-value');
    const winFreqText = document.getElementById('win-frequency-text');
    const soundCheckbox = document.getElementById('sound-enabled');
    const guaranteedWinCheckbox = document.getElementById('guaranteed-win-mode');
    const whatsappInput = document.getElementById('whatsapp-number');

    if (winFreqSlider) winFreqSlider.value = gameState.winFrequency;
    if (winFreqValue) winFreqValue.textContent = gameState.winFrequency;
    if (winFreqText) winFreqText.textContent = gameState.winFrequency;
    if (soundCheckbox) soundCheckbox.checked = gameState.soundEnabled;
    if (guaranteedWinCheckbox) guaranteedWinCheckbox.checked = gameState.guaranteedWinMode;
    if (whatsappInput) whatsappInput.value = gameState.whatsappNumber;

    // עדכן את הרדיו של מצב המשחק
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
        radio.checked = radio.value === gameState.mode;
    });

    // החזר צבע רקע אם שונה
    if (tempSettings.backgroundColor) {
        applyBackgroundColor(tempSettings.backgroundColor);
        updateColorPicker(tempSettings.backgroundColor);
    }

    // החזר מלאי
    updateInventoryDisplay();
    updateAllCounters();

    console.log('❌ ההגדרות לא נשמרו - חזרה להגדרות הקודמות');

    // סגור את מסך ההגדרות
    settingsScreen.classList.add('hidden');
});

// כשפותחים את ההגדרות, שמור את המצב הנוכחי
function openSettings() {
    tempSettings = {
        winFrequency: gameState.winFrequency,
        soundEnabled: gameState.soundEnabled,
        mode: gameState.mode,
        backgroundColor: gameState.backgroundColor,
        guaranteedWinMode: gameState.guaranteedWinMode,
        inventory: [...gameState.inventory],
        initialInventory: [...gameState.initialInventory],
        whatsappNumber: gameState.whatsappNumber
    };
    settingsScreen.classList.remove('hidden');
}

// כפתור הגדרות חדש
const settingsButton = document.getElementById('settings-button');
if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        if (!gameState.isSpinning) {
            openSettings();
        }
    });
}

// טיפול בהפעלת/כיבוי צלילים
const soundCheckbox = document.getElementById('sound-enabled');
if (soundCheckbox) {
    // טען את ההגדרה השמורה
    const savedSoundSetting = localStorage.getItem('soundEnabled');
    if (savedSoundSetting !== null) {
        gameState.soundEnabled = savedSoundSetting === 'true';
        soundCheckbox.checked = gameState.soundEnabled;
    }

    soundCheckbox.addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
        localStorage.setItem('soundEnabled', gameState.soundEnabled);
        console.log('🔊 צלילים:', gameState.soundEnabled ? 'מופעלים' : 'כבויים');
    });
}

// העלאת תמונות עם תצוגה מקדימה
function handleImageUpload(fileInput, index) {
    const previewElement = document.getElementById(`preview${index + 1}`);
    
    // טיפול בהעלאה רגילה
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file, index, previewElement);
        }
    });
    
    // תמיכה ב-Drag & Drop
    previewElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewElement.style.borderColor = '#ffed4e';
        previewElement.style.background = 'rgba(255, 215, 0, 0.1)';
    });
    
    previewElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewElement.style.borderColor = '';
        previewElement.style.background = '';
    });
    
    previewElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewElement.style.borderColor = '';
        previewElement.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file, index, previewElement);
        }
    });
}

// פונקציה לטעינת תמונה
function loadImage(file, index, previewElement) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        gameState.customSymbols[index] = imageData;
        
        // עדכן תצוגה מקדימה
        previewElement.style.backgroundImage = `url('${imageData}')`;
        previewElement.classList.add('has-image');
        
        // שמור ב-localStorage
        saveImagesToStorage();
        
        // אתחל מחדש את הגלילים
        initReels();
    };
    reader.readAsDataURL(file);
}

// הוסף מאזין לכל 9 שדות העלאה
for (let i = 0; i < 9; i++) {
    const fileInput = document.getElementById(`image${i + 1}`);
    if (fileInput) {
        handleImageUpload(fileInput, i);
    }
}

// איפוס תמונות
document.getElementById('reset-images').addEventListener('click', () => {
    gameState.customSymbols = [null, null, null, null, null, null, null, null, null];

    // מחק מ-localStorage
    clearImagesFromStorage();

    // איפוס גם את המדריך
    localStorage.removeItem('tutorialSeen');

    // נקה את כל השדות והתצוגות המקדימות
    for (let i = 1; i <= 9; i++) {
        const fileInput = document.getElementById(`image${i}`);
        const preview = document.getElementById(`preview${i}`);

        if (fileInput) fileInput.value = '';
        if (preview) {
            preview.style.backgroundImage = '';
            preview.classList.remove('has-image');

            // החזר את האייקון והטקסט
            if (!preview.querySelector('.preview-icon')) {
                preview.innerHTML = '<span class="preview-icon">📷</span><span class="preview-text">הוסף תמונה</span>';
            }
        }
    }

    initReels();
});

// טען תמונות מ-localStorage
function loadImagesFromStorage() {
    try {
        const savedImages = localStorage.getItem('slotMachineImages');
        if (savedImages) {
            const images = JSON.parse(savedImages);
            gameState.customSymbols = images;
            
            // עדכן תצוגה מקדימה
            images.forEach((img, index) => {
                if (img) {
                    const preview = document.getElementById(`preview${index + 1}`);
                    if (preview) {
                        preview.style.backgroundImage = `url('${img}')`;
                        preview.classList.add('has-image');
                    }
                }
            });
            
            console.log('✅ תמונות נטענו מהזיכרון');
        }
    } catch (e) {
        console.error('❌ שגיאה בטעינת תמונות:', e);
    }
}

// === ניהול צבע רקע ===

// טען צבע רקע מ-localStorage
function loadBackgroundColor() {
    try {
        const savedColor = localStorage.getItem('backgroundColor');
        if (savedColor) {
            gameState.backgroundColor = savedColor;
            applyBackgroundColor(savedColor);
            updateColorPicker(savedColor);
            console.log('✅ צבע רקע נטען:', savedColor);
        } else {
            // אם אין צבע שמור, השתמש בברירת מחדל
            applyBackgroundColor(gameState.backgroundColor);
            updateColorPicker(gameState.backgroundColor);
        }
    } catch (e) {
        console.error('❌ שגיאה בטעינת צבע רקע:', e);
    }
}

// החל צבע רקע על התאים
function applyBackgroundColor(color) {
    // יצירת גרדיאנט מהצבע שנבחר
    const darkenedColor = darkenColor(color, 20);
    const lighterColor = lightenColor(color, 8);

    // החל על כל התאים (reel-container) - עם !important כדי לדרוס את ה-CSS
    const reelContainers = document.querySelectorAll('.reel-container');
    reelContainers.forEach(container => {
        container.style.setProperty('background', `linear-gradient(180deg, ${color} 0%, ${darkenedColor} 100%)`, 'important');
    });

    // החל על כל הסמלים עצמם
    const symbols = document.querySelectorAll('.symbol');
    symbols.forEach(symbol => {
        symbol.style.setProperty('background', `linear-gradient(180deg, ${lighterColor} 0%, ${darkenedColor} 100%)`, 'important');
    });

    // עדכן גם את ה-body background
    document.body.style.setProperty('background', `linear-gradient(135deg, ${color} 0%, ${darkenedColor} 100%)`, 'important');

    // עדכן את ה-preview
    const colorPreview = document.getElementById('color-preview');
    if (colorPreview) {
        colorPreview.style.background = `linear-gradient(180deg, ${color} 0%, ${darkenedColor} 100%)`;
    }
}

// עדכן את ה-color picker וה-input
function updateColorPicker(color) {
    const colorPicker = document.getElementById('background-color-picker');
    const colorInput = document.getElementById('background-color-input');
    
    if (colorPicker) colorPicker.value = color;
    if (colorInput) colorInput.value = color;
}

// פונקציה להבהרת צבע
function lightenColor(color, percent) {
    // המר צבע hex ל-RGB
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) + Math.round(255 * (percent / 100))));
    const g = Math.min(255, (((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100))));
    const b = Math.min(255, ((num & 0x0000FF) + Math.round(255 * (percent / 100))));

    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// פונקציה להכהות צבע
function darkenColor(color, percent) {
    // המר צבע hex ל-RGB
    const num = parseInt(color.replace("#", ""), 16);
    const factor = 1 - (percent / 100);
    const r = Math.max(0, Math.round((num >> 16) * factor));
    const g = Math.max(0, Math.round(((num >> 8) & 0x00FF) * factor));
    const b = Math.max(0, Math.round((num & 0x0000FF) * factor));

    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// בדוק אם זה קוד צבע תקין
function isValidColor(color) {
    // בדיקה פשוטה: hex color
    const hexPattern = /^#[0-9A-F]{6}$/i;
    return hexPattern.test(color);
}

// שמור צבע רקע
function saveBackgroundColor(color) {
    try {
        localStorage.setItem('backgroundColor', color);
        gameState.backgroundColor = color;
        // עדכן גם את tempSettings כדי שהצבע לא יתאפס אם יוצאים בלי לשמור
        if (typeof tempSettings !== 'undefined' && tempSettings) {
            tempSettings.backgroundColor = color;
        }
        console.log('💾 צבע רקע נשמר:', color);
    } catch (e) {
        console.error('❌ שגיאה בשמירת צבע רקע:', e);
    }
}

// אתחול אירועים לבחירת צבע
function initColorPicker() {
    const colorPicker = document.getElementById('background-color-picker');
    const colorInput = document.getElementById('background-color-input');
    const colorPreview = document.getElementById('color-preview');

    // color picker
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            applyBackgroundColor(color);
            updateColorPicker(color);
            saveBackgroundColor(color);
        });
    }
    
    // קלט ידני של צבע
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            let color = e.target.value.trim();
            
            // אם לא מתחיל ב-#, הוסף אותו
            if (color && !color.startsWith('#')) {
                color = '#' + color;
                colorInput.value = color;
            }
            
            // אם זה צבע תקין, עדכן
            if (isValidColor(color)) {
                applyBackgroundColor(color);
                updateColorPicker(color);
                saveBackgroundColor(color);
                colorInput.style.borderColor = 'rgba(255, 215, 0, 0.5)';
            } else if (color.length >= 7) {
                // צבע לא תקין
                colorInput.style.borderColor = '#ff6b6b';
            }
        });
        
        // כשיוצאים מהשדה
        colorInput.addEventListener('blur', (e) => {
            const color = e.target.value.trim();
            if (!isValidColor(color)) {
                // אם לא תקין, חזור לצבע השמור
                colorInput.value = gameState.backgroundColor;
                colorInput.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            }
        });
    }
    
    // לחיצה על ה-preview פותחת את ה-color picker
    if (colorPreview) {
        colorPreview.addEventListener('click', () => {
            if (colorPicker) colorPicker.click();
        });
    }
}

// שמור תמונות ב-localStorage
function saveImagesToStorage() {
    try {
        localStorage.setItem('slotMachineImages', JSON.stringify(gameState.customSymbols));
        console.log('💾 תמונות נשמרו בזיכרון');
    } catch (e) {
        console.error('❌ שגיאה בשמירת תמונות:', e);
    }
}

// מחק תמונות מ-localStorage
function clearImagesFromStorage() {
    try {
        localStorage.removeItem('slotMachineImages');
        console.log('🗑️ תמונות נמחקו מהזיכרון');
    } catch (e) {
        console.error('❌ שגיאה במחיקת תמונות:', e);
    }
}

// פונקציה לניהול המדריך
function manageTutorial() {
    const tutorialModal = document.getElementById('tutorial-modal');
    const tutorialClose = document.getElementById('tutorial-close');
    const tutorialSettings = document.getElementById('tutorial-settings');

    // בדוק אם המדריך כבר הוצג
    const tutorialSeen = localStorage.getItem('tutorialSeen');

    if (!tutorialSeen) {
        // הצג את המדריך
        tutorialModal.style.display = 'flex';
    }

    // כפתור סגירת המדריך
    if (tutorialClose) {
        tutorialClose.addEventListener('click', () => {
            tutorialModal.style.display = 'none';
            // שמור שהמדריך הוצג
            localStorage.setItem('tutorialSeen', 'true');
        });
    }

    // כפתור הגדרות במודל
    if (tutorialSettings) {
        tutorialSettings.addEventListener('click', () => {
            tutorialModal.style.display = 'none';
            localStorage.setItem('tutorialSeen', 'true');
            openSettings();
        });
    }

    // סגור עם ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tutorialModal.style.display === 'flex') {
            tutorialModal.style.display = 'none';
            localStorage.setItem('tutorialSeen', 'true');
        }
    });
}

// פונקציות לטיפול בצלילים מותאמים
function setupCustomSoundUpload() {
    // העלאת צליל סיבוב
    const spinInput = document.getElementById('sound-spin');
    if (spinInput) {
        spinInput.addEventListener('change', (e) => {
            handleSoundUpload(e.target.files[0], 'spin');
        });
    }

    // העלאת צליל זכייה
    const winInput = document.getElementById('sound-win');
    if (winInput) {
        winInput.addEventListener('change', (e) => {
            handleSoundUpload(e.target.files[0], 'win');
        });
    }

    // העלאת צליל הפסד
    const loseInput = document.getElementById('sound-lose');
    if (loseInput) {
        loseInput.addEventListener('change', (e) => {
            handleSoundUpload(e.target.files[0], 'lose');
        });
    }

    // כפתורי איפוס
    document.querySelectorAll('.reset-sound').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const soundType = e.target.dataset.sound;
            resetSound(soundType);
        });
    });
}

// טיפול בהעלאת צליל
function handleSoundUpload(file, soundType) {
    if (!file || !file.type.startsWith('audio/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        gameState.customSounds[soundType] = event.target.result;
        saveCustomSounds();

        // עדכן את הצליל הנוכחי
        sounds[soundType] = new Audio(event.target.result);
        sounds[soundType].volume = soundType === 'win' ? 0.7 : 0.5;

        console.log(`🔊 צליל ${soundType} עודכן`);
    };
    reader.readAsDataURL(file);
}

// איפוס צליל לברירת מחדל
function resetSound(soundType) {
    gameState.customSounds[soundType] = null;
    saveCustomSounds();

    // החזר לצליל ברירת המחדל
    const defaultSounds = {
        spin: 'sounds/prize-wheel.mp3',
        win: 'sounds/Win.mp3',
        lose: 'sounds/Buzzer1.mp3'
    };

    sounds[soundType] = new Audio(defaultSounds[soundType]);
    sounds[soundType].volume = soundType === 'win' ? 0.7 : 0.5;

    // נקה את השדה
    const input = document.getElementById(`sound-${soundType}`);
    if (input) input.value = '';

    console.log(`🔄 צליל ${soundType} אופס לברירת מחדל`);
}


// פונקציות לניהול מלאי

// שמור מלאי ב-localStorage
function saveInventory() {
    try {
        localStorage.setItem('prizeInventory', JSON.stringify(gameState.inventory));
        localStorage.setItem('initialPrizeInventory', JSON.stringify(gameState.initialInventory));
        console.log('💾 מלאי נשמר:', gameState.inventory);
    } catch (e) {
        console.error('❌ שגיאה בשמירת מלאי:', e);
    }
}

// טען מלאי מ-localStorage
function loadInventory() {
    try {
        const savedInventory = localStorage.getItem('prizeInventory');
        const savedInitialInventory = localStorage.getItem('initialPrizeInventory');

        if (savedInventory) {
            gameState.inventory = JSON.parse(savedInventory);
            console.log('✅ מלאי נטען:', gameState.inventory);
        }

        if (savedInitialInventory) {
            gameState.initialInventory = JSON.parse(savedInitialInventory);
            console.log('✅ מלאי ראשוני נטען:', gameState.initialInventory);
        }

        updateInventoryDisplay();
        updateAllCounters();
    } catch (e) {
        console.error('❌ שגיאה בטעינת מלאי:', e);
    }
}

// עדכן תצוגת המלאי בממשק
function updateInventoryDisplay() {
    for (let i = 0; i < 9; i++) {
        const input = document.getElementById(`inventory${i + 1}`);
        if (input) {
            input.value = gameState.inventory[i] || 0;
        }
    }
}

// עדכן קאונטר בודד
function updateCounter(index) {
    const counter = document.getElementById(`counter${index + 1}`);
    if (counter) {
        const distributed = gameState.initialInventory[index] - gameState.inventory[index];
        const total = gameState.initialInventory[index];

        const distributedSpan = counter.querySelector('.distributed');
        const totalSpan = counter.querySelector('.total');

        if (distributedSpan) distributedSpan.textContent = distributed;
        if (totalSpan) totalSpan.textContent = total;
    }
}

// עדכן את כל הקאונטרים
function updateAllCounters() {
    for (let i = 0; i < 9; i++) {
        updateCounter(i);
    }
}

// הגדר מאזינים לשדות המלאי
function setupInventoryInputs() {
    for (let i = 0; i < 9; i++) {
        const input = document.getElementById(`inventory${i + 1}`);
        if (input) {
            input.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) || 0;
                gameState.inventory[i] = Math.max(0, value); // מינימום 0

                // עדכן גם את המלאי הראשוני אם זה גדול יותר
                if (value > gameState.initialInventory[i]) {
                    gameState.initialInventory[i] = value;
                }

                // עדכן את הקאונטר
                updateCounter(i);

                console.log(`📦 מלאי סמל ${i} עודכן ל-${gameState.inventory[i]}`);
            });
        }
    }

    // הגדר כפתורי איפוס אישיים
    const resetButtons = document.querySelectorAll('.reset-inventory-btn');
    resetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(btn.dataset.index);
            resetIndividualInventory(index);
        });
    });
}

// איפוס מלאי של פריט בודד
function resetIndividualInventory(index) {
    // אפס את המלאי
    gameState.inventory[index] = 0;
    gameState.initialInventory[index] = 0;

    // עדכן את השדה
    const input = document.getElementById(`inventory${index + 1}`);
    if (input) {
        input.value = 0;
    }

    // עדכן את הקאונטר
    updateCounter(index);

    // שמור
    saveInventory();

    console.log(`🔄 מלאי סמל ${index + 1} אופס`);
}

// טען הגדרות מ-localStorage
function loadSettings() {
    // טען תדירות זכיות
    const savedWinFreq = localStorage.getItem('winFrequency');
    if (savedWinFreq !== null) {
        gameState.winFrequency = parseInt(savedWinFreq);
        const winFreqSlider = document.getElementById('win-frequency');
        const winFreqValue = document.getElementById('win-frequency-value');
        const winFreqText = document.getElementById('win-frequency-text');

        if (winFreqSlider) winFreqSlider.value = gameState.winFrequency;
        if (winFreqValue) winFreqValue.textContent = gameState.winFrequency;
        if (winFreqText) winFreqText.textContent = gameState.winFrequency;
    }

    // טען מצב משחק
    const savedMode = localStorage.getItem('gameMode');
    if (savedMode) {
        gameState.mode = savedMode;
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.checked = radio.value === savedMode;
        });
    }

    // טען מצב זכייה מובטחת
    const savedGuaranteedWin = localStorage.getItem('guaranteedWinMode');
    if (savedGuaranteedWin !== null) {
        gameState.guaranteedWinMode = savedGuaranteedWin === 'true';
        const checkbox = document.getElementById('guaranteed-win-mode');
        if (checkbox) checkbox.checked = gameState.guaranteedWinMode;
    }

    // טען מספר WhatsApp
    const savedWhatsApp = localStorage.getItem('whatsappNumber');
    if (savedWhatsApp) {
        gameState.whatsappNumber = savedWhatsApp;
        const whatsappInput = document.getElementById('whatsapp-number');
        if (whatsappInput) {
            whatsappInput.value = savedWhatsApp;
        }
        console.log('📱 מספר WhatsApp נטען:', savedWhatsApp);
    }

    // טען טקסט מותאם ל-QR
    const savedCustomText = localStorage.getItem('qrCustomText');
    if (savedCustomText) {
        gameState.qrCustomText = savedCustomText;
        const customTextArea = document.getElementById('qr-custom-text');
        if (customTextArea) {
            customTextArea.value = savedCustomText;
        }
        console.log('💬 טקסט מותאם ל-QR נטען');
    }

    // טען טקסט נגלל
    const savedScrollingText = localStorage.getItem('scrollingBannerText');
    if (savedScrollingText) {
        gameState.scrollingBannerText = savedScrollingText;
        const bannerTextArea = document.getElementById('scrolling-banner-text');
        if (bannerTextArea) {
            bannerTextArea.value = savedScrollingText;
        }
        console.log('📜 טקסט נגלל נטען:', savedScrollingText);
    } else {
        // אם אין טקסט שמור, השתמש בברירת מחדל
        const defaultText = '🎰 ברוכים הבאים למכונת המזל! בהצלחה! 🎰';
        gameState.scrollingBannerText = defaultText;
        const bannerTextArea = document.getElementById('scrolling-banner-text');
        if (bannerTextArea) {
            bannerTextArea.value = defaultText;
        }
        localStorage.setItem('scrollingBannerText', defaultText);
        console.log('📜 טקסט ברירת מחדל נטען');
    }

    // טען גודל גופן לטקסט נגלל
    const savedFontSize = localStorage.getItem('scrollingBannerFontSize');
    if (savedFontSize) {
        gameState.scrollingBannerFontSize = parseInt(savedFontSize);
        const fontSizeSlider = document.getElementById('banner-font-size');
        const fontSizeValue = document.getElementById('banner-font-size-value');
        if (fontSizeSlider) fontSizeSlider.value = gameState.scrollingBannerFontSize;
        if (fontSizeValue) fontSizeValue.textContent = gameState.scrollingBannerFontSize;
        updateScrollingBanner();
        console.log(`📏 גודל גופן נגלל נטען: ${gameState.scrollingBannerFontSize}px`);
    }
}

// הגדרת מאזינים למספר WhatsApp
function setupWhatsAppInput() {
    const whatsappInput = document.getElementById('whatsapp-number');
    const clearBtn = document.getElementById('clear-whatsapp');

    if (whatsappInput) {
        // שמור בזמן הקלדה
        whatsappInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            gameState.whatsappNumber = value;
            console.log('📱 מספר WhatsApp עודכן:', value);

            // עדכן גם ב-Firebase אם יש session פעיל
            if (window.sessionManager && sessionManager.sessionId) {
                firebase.database().ref(`sessions/${sessionManager.sessionId}/settings/whatsappNumber`).set(value)
                    .then(() => console.log('📱 מספר WhatsApp עודכן ב-Firebase'))
                    .catch((error) => console.error('❌ שגיאה בעדכון WhatsApp ב-Firebase:', error));
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (whatsappInput) {
                whatsappInput.value = '';
                gameState.whatsappNumber = '';
                localStorage.removeItem('whatsappNumber');
                console.log('🗑️ מספר WhatsApp נמחק');

                // מחק גם מ-Firebase
                if (window.sessionManager && sessionManager.sessionId) {
                    firebase.database().ref(`sessions/${sessionManager.sessionId}/settings/whatsappNumber`).set('')
                        .then(() => console.log('🗑️ מספר WhatsApp נמחק מ-Firebase'))
                        .catch((error) => console.error('❌ שגיאה במחיקת WhatsApp מ-Firebase:', error));
                }
            }
        });
    }
}

// הגדרת מאזינים לטקסט מותאם ל-QR
function setupCustomTextInput() {
    const customTextArea = document.getElementById('qr-custom-text');
    const clearBtn = document.getElementById('clear-custom-text');

    if (customTextArea) {
        // שמור בזמן הקלדה
        customTextArea.addEventListener('input', (e) => {
            const value = e.target.value;
            gameState.qrCustomText = value;
            localStorage.setItem('qrCustomText', value);
            console.log('💬 טקסט מותאם ל-QR עודכן');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (customTextArea) {
                customTextArea.value = 'אל תשכחו! כדי לקבל את הפרס אתם צריכים לשלוח לנו תמונה שלכם עם מסך הזכייה בוואטסאפ 📸';
                gameState.qrCustomText = customTextArea.value;
                localStorage.setItem('qrCustomText', customTextArea.value);
                console.log('🔄 טקסט מותאם ל-QR אופס לברירת מחדל');
            }
        });
    }
}

// הגדרת מאזינים לטקסט נגלל
function setupScrollingBannerInput() {
    const bannerTextArea = document.getElementById('scrolling-banner-text');
    const clearBtn = document.getElementById('clear-scrolling-text');

    if (bannerTextArea) {
        // שמור בזמן הקלדה ועדכן תצוגה
        bannerTextArea.addEventListener('input', (e) => {
            const value = e.target.value;
            gameState.scrollingBannerText = value;
            localStorage.setItem('scrollingBannerText', value);
            updateScrollingBanner();
            console.log('📜 טקסט נגלל עודכן');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (bannerTextArea) {
                const defaultText = '🎰 ברוכים הבאים למכונת המזל! בהצלחה! 🎰';
                bannerTextArea.value = defaultText;
                gameState.scrollingBannerText = defaultText;
                localStorage.setItem('scrollingBannerText', defaultText);
                updateScrollingBanner();
                console.log('🔄 טקסט נגלל אופס לברירת מחדל');
            }
        });
    }
}

// עדכון פס מתגלגל
function updateScrollingBanner() {
    const banner = document.getElementById('scrolling-banner');
    const scrollingText = document.getElementById('scrolling-text');

    console.log('🔍 updateScrollingBanner נקרא');
    console.log('📋 banner element:', banner);
    console.log('📋 scrollingText element:', scrollingText);
    console.log('📝 טקסט נוכחי:', gameState.scrollingBannerText);
    console.log('📏 גודל גופן:', gameState.scrollingBannerFontSize);

    if (!banner || !scrollingText) {
        console.error('❌ אלמנטים לא נמצאו!');
        return;
    }

    if (gameState.scrollingBannerText && gameState.scrollingBannerText.length > 0) {
        scrollingText.textContent = gameState.scrollingBannerText;
        scrollingText.style.fontSize = gameState.scrollingBannerFontSize + 'px';

        // התאם את גובה הפס לגודל הגופן (גופן + 28px padding)
        const bannerHeight = gameState.scrollingBannerFontSize + 28;
        banner.style.height = bannerHeight + 'px';

        banner.classList.remove('hidden');
        console.log('✅ פס מתגלגל מוצג - טקסט:', gameState.scrollingBannerText);
        console.log('✅ גובה פס:', bannerHeight + 'px');
        console.log('✅ hidden class הוסר, classes:', banner.className);
    } else {
        banner.classList.add('hidden');
        console.log('🚫 פס מתגלגל מוסתר - אין טקסט');
    }
}

// הגדרת מאזינים לגודל גופן נגלל
function setupBannerFontSizeControl() {
    const fontSizeSlider = document.getElementById('banner-font-size');
    const fontSizeValue = document.getElementById('banner-font-size-value');

    if (fontSizeSlider && fontSizeValue) {
        // עדכן את התצוגה של הערך
        fontSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            fontSizeValue.textContent = size;
            gameState.scrollingBannerFontSize = size;
            localStorage.setItem('scrollingBannerFontSize', size);
            updateScrollingBanner();
            console.log(`📏 גודל גופן נגלל עודכן ל-${size}px`);
        });
    }
}

// הגדר סגירת QR בלחיצה על המסך
function setupQRPopupClose() {
    const qrPopup = document.getElementById('qr-popup');

    if (qrPopup) {
        // סגור בלחיצת עכבר
        qrPopup.addEventListener('click', () => {
            if (gameState.qrPopupVisible) {
                closeQRPopup();
            }
        });

        // סגור במגע
        qrPopup.addEventListener('touchstart', (e) => {
            if (gameState.qrPopupVisible) {
                e.preventDefault();
                closeQRPopup();
            }
        }, { passive: false });
    }
}

// אתחול
loadSettings(); // טען הגדרות שמורות
initSounds();

// אתחל מערכת תמונות דינמית חדשה
if (window.dynamicImagesManager) {
    dynamicImagesManager.init();
    console.log('✅ מערכת תמונות דינמית אותחלה');
}

loadImagesFromStorage(); // טען תמונות שמורות (מערכת ישנה - לתאימות)
loadInventory(); // טען מלאי שמור
initColorPicker(); // אתחל color picker
initReels();
loadBackgroundColor(); // טען צבע רקע שמור - אחרי initReels כדי שהצבע יוחל על הסמלים
manageTutorial(); // נהל את המדריך
setupCustomSoundUpload(); // הגדר העלאת צלילים מותאמים
setupInventoryInputs(); // הגדר שדות מלאי
setupWhatsAppInput(); // הגדר שדה WhatsApp
setupCustomTextInput(); // הגדר שדה טקסט מותאם ל-QR
setupScrollingBannerInput(); // הגדר שדה טקסט נגלל
setupBannerFontSizeControl(); // הגדר גודל גופן לטקסט נגלל
setupQRPopupClose(); // הגדר סגירת QR popup בלחיצה
updateScrollingBanner(); // הצג את הטקסט הנגלל בהתחלה

// הגדר מאזין למצב זכייה מובטחת
const guaranteedWinCheckbox = document.getElementById('guaranteed-win-mode');
if (guaranteedWinCheckbox) {
    guaranteedWinCheckbox.addEventListener('change', (e) => {
        gameState.guaranteedWinMode = e.target.checked;
        console.log('🎯 מצב זכייה מובטחת:', gameState.guaranteedWinMode ? 'מופעל' : 'כבוי');
    });
}

console.log('🎰 777 Slot Machine Ready!');
console.log('Press ENTER, Click or Touch to spin!');
console.log('Press ד or S for settings');

// ============================================
// FIREBASE REMOTE CONTROL INTEGRATION
// ============================================

// Flag to track if we're waiting for remote control
let isRemoteControlActive = false;

// Function to handle remote buzzer trigger
function handleRemoteBuzzer() {
    console.log('🔴 Remote buzzer activated!');

    // Play the buzzer sound (lose sound)
    playSound('lose');

    // If in automatic mode, trigger the spin
    if (gameState.mode === 'automatic' && !gameState.isSpinning) {
        setTimeout(() => {
            triggerSpin();
        }, 500); // Small delay for better UX
    }
}

// Initialize remote control integration when session manager is ready
if (typeof sessionManager !== 'undefined' && sessionManager) {
    console.log('🎮 Remote control integration active');
    isRemoteControlActive = true;
}

