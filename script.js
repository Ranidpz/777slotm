// הגדרות משחק
const gameState = {
    mode: 'automatic', // automatic או manual
    isSpinning: false,
    customSymbols: [null, null, null],
    defaultSymbols: ['🍒', '🍋', '🍊', '🍉', '🍇', '⭐', '💎', '7️⃣'],
    manualStops: [false, false, false],
    currentReel: 0
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
        
        // צור לולאה ארוכה של סמלים
        let symbolsHTML = '';
        for (let i = 0; i < 50; i++) {
            const symbol = symbols[i % symbols.length];
            if (gameState.customSymbols[index]) {
                symbolsHTML += `<div class="symbol custom-image" style="background-image: url(${symbol})"></div>`;
            } else {
                symbolsHTML += `<div class="symbol">${symbol}</div>`;
            }
        }
        reel.innerHTML = symbolsHTML;
    });
}

// התחל סיבוב
function startSpin() {
    if (gameState.isSpinning) return;
    
    gameState.isSpinning = true;
    gameState.manualStops = [false, false, false];
    gameState.currentReel = 0;
    
    sounds.spin.play();
    
    // התחל סיבוב כל הגלילים
    reels.forEach(reel => {
        reel.classList.add('spinning');
        reel.style.transform = 'translateY(0)';
    });
    
    if (gameState.mode === 'automatic') {
        // במצב אוטומטי - עצור את הגלילים אחד אחד
        setTimeout(() => stopReel(0), 3000);
        setTimeout(() => stopReel(1), 4000);
        setTimeout(() => stopReel(2), 5000);
    }
}

// עצור גלגל ספציפי
function stopReel(reelIndex) {
    const reel = reels[reelIndex];
    reel.classList.remove('spinning');
    
    // בחר עמדה אקראית
    const symbolHeight = reel.querySelector('.symbol').offsetHeight;
    const totalSymbols = reel.querySelectorAll('.symbol').length;
    const randomIndex = Math.floor(Math.random() * 8); // 8 סמלים שונים
    const centerOffset = symbolHeight * 1.5; // מרכז את הסמבול
    const position = -(randomIndex * symbolHeight) + centerOffset;
    
    reel.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    reel.style.transform = `translateY(${position}px)`;
    
    gameState.manualStops[reelIndex] = true;
    
    // בדוק אם כל הגלילים נעצרו
    if (gameState.manualStops.every(stopped => stopped)) {
        setTimeout(() => checkWin(), 500);
    }
}

// בדוק זכיה
function checkWin() {
    gameState.isSpinning = false;
    
    // קבל את הסמלים המוצגים
    const displayedSymbols = reels.map(reel => {
        const transform = reel.style.transform;
        const translateY = parseFloat(transform.match(/-?\d+\.?\d*/)?.[0] || 0);
        const symbolHeight = reel.querySelector('.symbol').offsetHeight;
        const index = Math.round(Math.abs(translateY - symbolHeight * 1.5) / symbolHeight);
        return reel.querySelectorAll('.symbol')[index]?.textContent || 
               reel.querySelectorAll('.symbol')[index]?.style.backgroundImage;
    });
    
    // בדוק אם כל הסמלים זהים
    const isWin = displayedSymbols[0] && 
                  displayedSymbols[0] === displayedSymbols[1] && 
                  displayedSymbols[1] === displayedSymbols[2];
    
    if (isWin) {
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
}

// פונקציה להפעלת המכונה
function triggerSpin() {
    if (gameState.mode === 'automatic') {
        startSpin();
    } else if (gameState.mode === 'manual') {
        if (!gameState.isSpinning) {
            startSpin();
        } else {
            // עצור את הגלגל הבא
            if (gameState.currentReel < 3 && !gameState.manualStops[gameState.currentReel]) {
                stopReel(gameState.currentReel);
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

