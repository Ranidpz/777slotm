// הגדרות משחק
const gameState = {
    mode: 'automatic', // automatic או manual
    isSpinning: false,
    customSymbols: [null, null, null],
    defaultSymbols: ['🍒', '🍋', '🍊', '🍉', '🍇', '⭐', '💎', '7️⃣'],
    manualStops: [false, false, false],
    currentReel: 0,
    spinsCount: 0,
    winFrequency: 3, // זכייה כל כמה נסיונות (0 = רנדומלי לגמרי)
    lastWinAt: 0
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
    // נוצור צלילים סינתטיים עד שהמשתמש יעלה קבצי סאונד
    sounds.spin = createSyntheticSound('spin');
    sounds.win = createSyntheticSound('win');
    sounds.lose = createSyntheticSound('lose');
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
    reels.forEach((reel, index) => {
        const symbols = gameState.customSymbols[index] 
            ? [gameState.customSymbols[index]] 
            : gameState.defaultSymbols;
        
        // צור לולאה ארוכה של סמלים - 100 סמלים לאנימציה חלקה
        let symbolsHTML = '';
        for (let i = 0; i < 100; i++) {
            const symbol = symbols[i % symbols.length];
            if (gameState.customSymbols[index]) {
                symbolsHTML += `<div class="symbol custom-image" style="background-image: url(${symbol})"></div>`;
            } else {
                symbolsHTML += `<div class="symbol">${symbol}</div>`;
            }
        }
        reel.innerHTML = symbolsHTML;
        
        // הצב את הגליל במרכז
        reel.style.transform = 'translateY(0)';
    });
}

// התחל סיבוב
function startSpin() {
    if (gameState.isSpinning) return;
    
    gameState.isSpinning = true;
    gameState.manualStops = [false, false, false];
    gameState.currentReel = 0;
    gameState.spinsCount++;
    
    sounds.spin.play();
    
    // קבע אם זה צריך להיות סיבוב זוכה
    const shouldWin = determineWin();
    
    // התחל סיבוב כל הגלילים
    reels.forEach(reel => {
        reel.classList.add('spinning');
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
    });
    
    if (gameState.mode === 'automatic') {
        // במצב אוטומטי - עצור את הגלילים אחד אחד
        setTimeout(() => stopReel(0, shouldWin), 3000);
        setTimeout(() => stopReel(1, shouldWin), 4000);
        setTimeout(() => stopReel(2, shouldWin), 5000);
    }
}

// קבע אם זה צריך להיות סיבוב זוכה
function determineWin() {
    if (gameState.winFrequency === 0) {
        // רנדומלי לגמרי
        return Math.random() < 0.1; // 10% סיכוי לזכייה
    }
    
    // בדוק אם הגיע הזמן לזכייה מובטחת
    const spinsSinceLastWin = gameState.spinsCount - gameState.lastWinAt;
    if (spinsSinceLastWin >= gameState.winFrequency) {
        return true;
    }
    
    // יש גם סיכוי רנדומלי קטן לזכות לפני זה
    return Math.random() < 0.05; // 5% סיכוי
}

// עצור גלגל ספציפי
function stopReel(reelIndex, shouldWin = false) {
    const reel = reels[reelIndex];
    reel.classList.remove('spinning');
    
    const symbolHeight = window.innerHeight / 3; // גובה מדויק של סמל אחד
    let targetSymbolIndex;
    
    if (shouldWin) {
        // אם צריך לזכות - בחר סמל משותף
        if (reelIndex === 0) {
            // הגלגל הראשון קובע את הסמל הזוכה
            gameState.winningSymbol = Math.floor(Math.random() * 8);
            targetSymbolIndex = gameState.winningSymbol;
        } else {
            // שאר הגלילים יתאימו
            targetSymbolIndex = gameState.winningSymbol;
        }
    } else {
        // בחר סמל אקראי
        targetSymbolIndex = Math.floor(Math.random() * 8);
        
        // אם זה לא גלגל ראשון, ודא שזה לא יהיה אותו סמל (למנוע זכיות לא מתוכננות)
        if (reelIndex > 0 && gameState.firstSymbol !== undefined) {
            while (targetSymbolIndex === gameState.firstSymbol && Math.random() > 0.1) {
                targetSymbolIndex = Math.floor(Math.random() * 8);
            }
        }
    }
    
    // שמור את הסמל הראשון
    if (reelIndex === 0) {
        gameState.firstSymbol = targetSymbolIndex;
    }
    
    // חשב את המיקום המדויק כך שהסמל יהיה ממורכז במסך
    // נעצור בסמל שנמצא בטווח 10-20 כדי לוודא שיש מספיק סמלים מסביב
    const basePosition = 10 + targetSymbolIndex;
    const position = -(basePosition * symbolHeight) + symbolHeight; // +symbolHeight כדי למרכז
    
    reel.style.transition = 'transform 0.8s cubic-bezier(0.17, 0.67, 0.35, 0.98)';
    reel.style.transform = `translateY(${position}px)`;
    
    gameState.manualStops[reelIndex] = true;
    
    // בדוק אם כל הגלילים נעצרו
    if (gameState.manualStops.every(stopped => stopped)) {
        setTimeout(() => checkWin(), 600);
    }
}

// בדוק זכיה
function checkWin() {
    gameState.isSpinning = false;
    
    const symbolHeight = window.innerHeight / 3;
    
    // קבל את הסמלים המרכזיים המוצגים
    const displayedSymbols = reels.map(reel => {
        const transform = reel.style.transform;
        const translateY = parseFloat(transform.match(/-?\d+\.?\d*/)?.[0] || 0);
        // חשב איזה סמל נמצא במרכז המסך
        const centerIndex = Math.round((Math.abs(translateY) - symbolHeight) / symbolHeight);
        const symbolElement = reel.querySelectorAll('.symbol')[centerIndex];
        return symbolElement?.textContent || symbolElement?.style.backgroundImage;
    });
    
    // בדוק אם כל הסמלים זהים
    const isWin = displayedSymbols[0] && 
                  displayedSymbols[0] === displayedSymbols[1] && 
                  displayedSymbols[1] === displayedSymbols[2];
    
    if (isWin) {
        gameState.lastWinAt = gameState.spinsCount;
        sounds.win.play();
        winOverlay.classList.remove('hidden');
        winOverlay.classList.add('flashing');
        
        setTimeout(() => {
            winOverlay.classList.remove('flashing');
            winOverlay.classList.add('hidden');
        }, 1500);
    } else {
        sounds.lose.play();
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
            
            sounds.spin.play();
            
            // קבע אם זה צריך להיות סיבוב זוכה
            gameState.shouldWinManual = determineWin();
            
            // התחל סיבוב כל הגלילים
            reels.forEach(reel => {
                reel.classList.add('spinning');
                reel.style.transition = 'none';
                reel.style.transform = 'translateY(0)';
            });
        } else {
            // עצור את הגלגל הבא
            if (gameState.currentReel < 3 && !gameState.manualStops[gameState.currentReel]) {
                stopReel(gameState.currentReel, gameState.shouldWinManual);
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

// העלאת תמונות
function handleImageUpload(fileInput, index) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                gameState.customSymbols[index] = event.target.result;
                initReels();
            };
            reader.readAsDataURL(file);
        }
    });
}

handleImageUpload(document.getElementById('image1'), 0);
handleImageUpload(document.getElementById('image2'), 1);
handleImageUpload(document.getElementById('image3'), 2);

document.getElementById('reset-images').addEventListener('click', () => {
    gameState.customSymbols = [null, null, null];
    document.getElementById('image1').value = '';
    document.getElementById('image2').value = '';
    document.getElementById('image3').value = '';
    initReels();
});

// אתחול
initSounds();
initReels();

console.log('🎰 777 Slot Machine Ready!');
console.log('Press ENTER, Click or Touch to spin!');
console.log('Press ד or S for settings');

