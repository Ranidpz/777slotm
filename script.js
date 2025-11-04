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
    customSounds: { // צלילים מותאמים אישית
        spin: null,
        win: null,
        lose: null
    }
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

        // הגדרת ווליום
        sounds.spin.volume = 0.5;
        sounds.win.volume = 0.7;
        sounds.lose.volume = 0.5;
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
                sound.currentTime = 0; // אתחל מההתחלה
                sound.play().catch(e => {
                    console.log(`לא ניתן להפעיל צליל ${soundName}:`, e);
                });
            } else {
                // צליל סינתטי
                sound.play();
            }
        }
    } catch (e) {
        console.log(`שגיאה בהפעלת צליל ${soundName}:`, e);
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
    // איסוף כל התמונות המותאמות
    const uploadedImages = gameState.customSymbols.filter(img => img !== null);
    
    // יצירת מערך סמלים משולב
    let allSymbols;
    if (uploadedImages.length > 0) {
        // אם יש תמונות מותאמות, השתמש בהן
        allSymbols = [...uploadedImages];
        
        // אם יש פחות מ-9 תמונות, הוסף סמלים דיפולטיים להשלמה
        if (allSymbols.length < 9) {
            const neededSymbols = 9 - allSymbols.length;
            const remainingSymbols = gameState.defaultSymbols.slice(0, neededSymbols);
            allSymbols = [...allSymbols, ...remainingSymbols];
        }
    } else {
        // אם אין תמונות מותאמות, השתמש בסמלים הדיפולטיים
        allSymbols = [...gameState.defaultSymbols];
    }
    
    reels.forEach((reel) => {
        // צור לולאה ארוכה של סמלים - 100 סמלים לאנימציה חלקה
        // כל גליל יקבל ערבוב רנדומלי של הסמלים
        let symbolsHTML = '';
        
        // צור מערך מעורבב של סמלים לכל גליל
        const shuffledSymbols = [];
        for (let i = 0; i < 100; i++) {
            // הוסף סמלים בסדר אקראי
            if (i < allSymbols.length) {
                shuffledSymbols.push(allSymbols[i]);
            } else {
                // אחרי הסיבוב הראשון, ערבב רנדומלית
                const randomIndex = Math.floor(Math.random() * allSymbols.length);
                shuffledSymbols.push(allSymbols[randomIndex]);
            }
        }
        
        // בנה את ה-HTML
        shuffledSymbols.forEach(symbol => {
            // בדוק אם זה URL של תמונה (מתחיל ב-data: או http)
            const isImage = typeof symbol === 'string' && (symbol.startsWith('data:') || symbol.startsWith('http'));
            
            if (isImage) {
                symbolsHTML += `<div class="symbol custom-image" style="background-image: url('${symbol}')"></div>`;
            } else {
                symbolsHTML += `<div class="symbol">${symbol}</div>`;
            }
        });
        
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

// קבע אם זה צריך להיות סיבוב זוכה - אלגוריתם פשוט מאוד
function determineWin() {
    if (gameState.winFrequency === 0) {
        // רנדומלי לגמרי
        return Math.random() < 0.15; // 15% סיכוי לזכייה
    }

    // ספירה פשוטה: כל X סיבובים - זכייה
    // נתחיל מ-1 כדי שהסיבוב הראשון יהיה 1 ולא 0
    const currentSpin = (gameState.spinsCount % gameState.winFrequency) || gameState.winFrequency;
    const shouldWin = currentSpin === gameState.winFrequency;

    console.log(`🎰 סיבוב כללי: ${gameState.spinsCount}`);
    console.log(`📊 סיבוב במחזור: ${currentSpin} מתוך ${gameState.winFrequency}`);
    console.log(`${shouldWin ? '✅ זכייה מובטחת!' : `⏳ עוד ${gameState.winFrequency - currentSpin} סיבובים לזכייה`}`);

    return shouldWin;
}

// עצור גלגל בצורה חלקה וטבעית
function stopReelSmooth(reelIndex, shouldWin = false) {
    const reel = reels[reelIndex];
    const symbolHeight = window.innerHeight / 3;
    const numSymbols = gameState.totalSymbols || 9;
    
    // קבע את הסמל היעד
    let targetSymbolIndex;
    if (shouldWin) {
        if (reelIndex === 0) {
            gameState.winningSymbol = Math.floor(Math.random() * numSymbols);
            targetSymbolIndex = gameState.winningSymbol;
        } else {
            targetSymbolIndex = gameState.winningSymbol;
        }
    } else {
        targetSymbolIndex = Math.floor(Math.random() * numSymbols);
        if (reelIndex > 0 && gameState.firstSymbol !== undefined) {
            while (targetSymbolIndex === gameState.firstSymbol && Math.random() > 0.1) {
                targetSymbolIndex = Math.floor(Math.random() * numSymbols);
            }
        }
    }
    
    if (reelIndex === 0) {
        gameState.firstSymbol = targetSymbolIndex;
    }
    
    // עצור את האנימציה האינסופית
    reel.classList.remove('spinning');
    
    // קבל את המיקום הנוכחי
    const currentTransform = window.getComputedStyle(reel).transform;
    const matrix = new DOMMatrix(currentTransform);
    const currentY = matrix.m42 || 0;
    
    // חשב את המיקום היעד - בחר סמל באמצע מערך הסמלים
    const basePosition = 20; // סמל מספר 20 מתוך 100
    const finalSymbolPosition = basePosition + targetSymbolIndex;
    
    // המיקום הסופי כדי שהסמל יהיה ממורכז במסך
    // צריך שהסמל יהיה בגובה של שליש אחד מהמסך (במרכז)
    const finalY = -(finalSymbolPosition * symbolHeight) + symbolHeight;
    
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

        playSound('win');
        winOverlay.classList.remove('hidden');
        winOverlay.classList.add('flashing');

        setTimeout(() => {
            winOverlay.classList.remove('flashing');
            winOverlay.classList.add('hidden');
        }, 1500);
    } else {
        playSound('lose');
        console.log(`❌ לא זכייה. הסמלים: [${displayedSymbols[0]}] [${displayedSymbols[1]}] [${displayedSymbols[2]}]`);
    }
    
    // נקה את הסמל הראשון
    delete gameState.firstSymbol;
    delete gameState.winningSymbol;
}

// פונקציה להפעלת המכונה
function triggerSpin() {
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
            settingsScreen.classList.remove('hidden');
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

document.getElementById('close-settings').addEventListener('click', () => {
    settingsScreen.classList.add('hidden');
});

// כפתור הגדרות חדש
const settingsButton = document.getElementById('settings-button');
if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        if (!gameState.isSpinning) {
            settingsScreen.classList.remove('hidden');
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

// החל צבע רקע על המסך
function applyBackgroundColor(color) {
    // יצירת גרדיאנט מהצבע שנבחר
    const lightenedColor = lightenColor(color, 20);
    document.body.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenedColor} 100%)`;
    
    // עדכן את ה-preview
    const colorPreview = document.getElementById('color-preview');
    if (colorPreview) {
        colorPreview.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenedColor} 100%)`;
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
    const resetBtn = document.getElementById('reset-background-color');
    
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
    
    // כפתור איפוס
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const defaultColor = '#667eea';
            applyBackgroundColor(defaultColor);
            updateColorPicker(defaultColor);
            saveBackgroundColor(defaultColor);
            console.log('🔄 צבע רקע אופס לברירת מחדל');
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
            settingsScreen.classList.remove('hidden');
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


// אתחול
initSounds();
loadImagesFromStorage(); // טען תמונות שמורות
loadBackgroundColor(); // טען צבע רקע שמור
initColorPicker(); // אתחל color picker
initReels();
manageTutorial(); // נהל את המדריך
setupCustomSoundUpload(); // הגדר העלאת צלילים מותאמים

console.log('🎰 777 Slot Machine Ready!');
console.log('Press ENTER, Click or Touch to spin!');
console.log('Press ד or S for settings');



