/* ===== Raffle Page - 777 Playzone ===== */
/* Performance-optimized: only 7 DOM elements for the roulette strip */
/* Supports 10K+ participants with no performance issues */

// ───────── Storage Keys ─────────
const STORAGE = {
    PARTICIPANTS: 'raffle_participants',
    WINNERS: 'raffle_winners',
    SETTINGS: 'raffle_settings',
    DRAW_COUNT: 'raffle_draw_count'
};

// ───────── State ─────────
const state = {
    participants: [],
    winners: [],
    phase: 'idle', // idle | spinning | decelerating | stopped
    displayMode: 'name',
    allowReselect: true,
    soundEnabled: true,
    drawCount: 0,
    bgType: 'color',
    bgColor: '#0a0a0f',
    fontColor: '#ffffff',

    // Animation
    animationId: null,
    targetParticipantIndex: null,
    lastTickIndex: -1,
    itemHeight: 200,

    // Audio
    audioContext: null,
    buzzerSound: null,

    // Media URLs
    videoObjectURL: null,
    imageObjectURL: null
};

// ───────── Animation Engine (virtual scroll) ─────────
const anim = {
    shuffled: [],          // Pre-shuffled participant indices
    vPos: 0,               // Virtual position in pixels (increases as we scroll up)
    vel: 0,                // Velocity in pixels per frame
    pool: [],              // 7 DOM elements
    winnerLogicalIdx: -1,  // Logical item index where the winner is placed
    targetVPos: 0          // Target position for deceleration
};

const POOL_SIZE = 7;
const CENTER_OFFSET = 3; // Index of center element in pool

// ───────── DOM Cache ─────────
const dom = {};

function cacheDom() {
    dom.bgVideo = document.getElementById('bg-video');
    dom.bgImage = document.getElementById('bg-image');
    dom.bgOverlay = document.getElementById('bg-overlay');
    dom.stage = document.getElementById('raffle-stage');
    dom.viewport = document.getElementById('roulette-viewport');
    dom.strip = document.getElementById('roulette-strip');
    dom.winnerAnnouncement = document.getElementById('winner-announcement');
    dom.winnerNameDisplay = document.getElementById('winner-name-display');
    dom.firstVisitTooltip = document.getElementById('first-visit-tooltip');
    dom.settingsPanel = document.getElementById('settings-panel');
    dom.panelCloseBtn = document.getElementById('panel-close-btn');
    dom.excelFileInput = document.getElementById('excel-file-input');
    dom.fileUploadArea = document.getElementById('file-upload-area');
    dom.fileStatus = document.getElementById('file-status');
    dom.videoFileInput = document.getElementById('video-file-input');
    dom.imageFileInput = document.getElementById('image-file-input');
    dom.clearVideoBtn = document.getElementById('clear-video-btn');
    dom.clearImageBtn = document.getElementById('clear-image-btn');
    dom.bgColorSection = document.getElementById('bg-color-section');
    dom.bgVideoSection = document.getElementById('bg-video-section');
    dom.bgImageSection = document.getElementById('bg-image-section');
    dom.bgColorPicker = document.getElementById('bg-color-picker');
    dom.fontColorPicker = document.getElementById('font-color-picker');
    dom.displayModeToggle = document.getElementById('display-mode-toggle');
    dom.allowReselectToggle = document.getElementById('allow-reselect');
    dom.soundEnabledToggle = document.getElementById('sound-enabled-toggle');
    dom.exportBtn = document.getElementById('export-winners-btn');
    dom.resetWinnersBtn = document.getElementById('reset-winners-btn');
    dom.resetAllBtn = document.getElementById('reset-all-btn');
    dom.winnersCount = document.getElementById('winners-count');
    dom.winnersList = document.getElementById('winners-list');
    dom.loadDemoBtn = document.getElementById('load-demo-btn');
}

// ───────── Init ─────────
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    loadState();

    // Auto-load demo on first visit (no participants in storage)
    if (state.participants.length === 0) {
        state.participants = generateDemoData(1000);
        saveState();
        dom.fileUploadArea.classList.add('has-file');
        showFileStatus('נטענו 1,000 משתתפים (דמו)');
    }

    initSounds();
    setupKeyboard();
    setupPanelControls();
    setupFileUpload();
    setupBackgroundControls();
    applySettings();
    renderWinnersList();
    showFirstVisitTooltip();
});

// ───────── Persistence ─────────
function saveState() {
    try {
        const participants = state.participants.map(p => ({
            name: p.name,
            phone: p.phone,
            quantity: p.quantity,
            remainingSelections: p.remainingSelections === Infinity ? -1 : p.remainingSelections
        }));
        localStorage.setItem(STORAGE.PARTICIPANTS, JSON.stringify(participants));
        localStorage.setItem(STORAGE.WINNERS, JSON.stringify(state.winners));
        localStorage.setItem(STORAGE.DRAW_COUNT, state.drawCount);
        localStorage.setItem(STORAGE.SETTINGS, JSON.stringify({
            displayMode: state.displayMode,
            allowReselect: state.allowReselect,
            soundEnabled: state.soundEnabled,
            bgType: state.bgType,
            bgColor: state.bgColor,
            fontColor: state.fontColor
        }));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

function loadState() {
    try {
        const p = localStorage.getItem(STORAGE.PARTICIPANTS);
        if (p) {
            state.participants = JSON.parse(p).map(item => ({
                ...item,
                remainingSelections: item.remainingSelections === -1 ? Infinity : item.remainingSelections
            }));
        }
        const w = localStorage.getItem(STORAGE.WINNERS);
        if (w) state.winners = JSON.parse(w);
        state.drawCount = parseInt(localStorage.getItem(STORAGE.DRAW_COUNT)) || 0;
        const s = localStorage.getItem(STORAGE.SETTINGS);
        if (s) Object.assign(state, JSON.parse(s));
    } catch (e) {
        console.warn('Failed to load state:', e);
    }
}

function applySettings() {
    dom.bgColorPicker.value = state.bgColor;
    applyBackground();
    dom.fontColorPicker.value = state.fontColor;
    document.documentElement.style.setProperty('--roulette-text-color', state.fontColor);
    dom.displayModeToggle.checked = state.displayMode === 'phone';
    dom.allowReselectToggle.checked = state.allowReselect;
    dom.soundEnabledToggle.checked = state.soundEnabled;
    const radios = document.querySelectorAll('input[name="bg-type"]');
    radios.forEach(r => { r.checked = r.value === state.bgType; });
    updateBgSections();
}

// ───────── Keyboard ─────────
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') closePanel();
            return;
        }

        if (e.key === 'Control') {
            e.preventDefault();
            togglePanel();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleEnter();
            return;
        }

        if (e.key === 'Escape') {
            closePanel();
        }
    });
}

function handleEnter() {
    if (state.participants.length === 0) return;

    switch (state.phase) {
        case 'idle':
        case 'stopped':
            startSpin();
            break;
        case 'spinning':
            beginDeceleration();
            break;
    }
}

// ───────── Panel ─────────
function togglePanel() {
    if (dom.settingsPanel.classList.contains('panel-open')) closePanel();
    else openPanel();
}

function openPanel() {
    dom.settingsPanel.classList.add('panel-open');
    dom.settingsPanel.classList.remove('panel-closed');
}

function closePanel() {
    dom.settingsPanel.classList.remove('panel-open');
    dom.settingsPanel.classList.add('panel-closed');
}

function setupPanelControls() {
    dom.panelCloseBtn.addEventListener('click', closePanel);

    dom.displayModeToggle.addEventListener('change', () => {
        state.displayMode = dom.displayModeToggle.checked ? 'phone' : 'name';
        saveState();
    });

    dom.allowReselectToggle.addEventListener('change', () => {
        state.allowReselect = dom.allowReselectToggle.checked;
        saveState();
    });

    dom.soundEnabledToggle.addEventListener('change', () => {
        state.soundEnabled = dom.soundEnabledToggle.checked;
        saveState();
    });

    dom.fontColorPicker.addEventListener('input', () => {
        state.fontColor = dom.fontColorPicker.value;
        document.documentElement.style.setProperty('--roulette-text-color', state.fontColor);
        saveState();
    });

    dom.exportBtn.addEventListener('click', exportWinnersCSV);

    dom.resetWinnersBtn.addEventListener('click', () => {
        if (!confirm('האם למחוק את כל רשימת הזוכים?')) return;
        resetWinners();
    });

    dom.resetAllBtn.addEventListener('click', () => {
        if (!confirm('האם לאפס הכל? (משתתפים, זוכים, והגדרות)')) return;
        resetAll();
    });

    // Load demo
    dom.loadDemoBtn.addEventListener('click', () => {
        const participants = generateDemoData(1000);
        state.participants = participants;
        state.winners = [];
        state.drawCount = 0;
        state.phase = 'idle';
        dom.strip.innerHTML = '';
        dom.winnerAnnouncement.classList.add('hidden');
        saveState();
        renderWinnersList();
        dom.fileUploadArea.classList.add('has-file');
        showFileStatus('נטענו 1,000 משתתפים (דמו)');
    });
}

// ───────── File Upload (Excel) ─────────
function setupFileUpload() {
    dom.fileUploadArea.addEventListener('click', () => dom.excelFileInput.click());

    dom.excelFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const participants = await parseExcelFile(file);
            if (participants.length === 0) {
                showFileStatus('לא נמצאו משתתפים בקובץ', true);
                return;
            }
            state.participants = participants;
            state.winners = [];
            state.drawCount = 0;
            state.phase = 'idle';
            dom.strip.innerHTML = '';
            dom.winnerAnnouncement.classList.add('hidden');
            saveState();
            renderWinnersList();


            dom.fileUploadArea.classList.add('has-file');
            showFileStatus(`נטענו ${participants.length} משתתפים מ-${file.name}`);
        } catch (err) {
            console.error('Excel parse error:', err);
            showFileStatus('שגיאה בקריאת הקובץ', true);
        }
    });

    // Drag and drop
    dom.fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.fileUploadArea.style.borderColor = '#FFD700';
    });
    dom.fileUploadArea.addEventListener('dragleave', () => {
        dom.fileUploadArea.style.borderColor = '';
    });
    dom.fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.fileUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            dom.excelFileInput.files = dt.files;
            dom.excelFileInput.dispatchEvent(new Event('change'));
        }
    });
}

function showFileStatus(msg, isError) {
    dom.fileStatus.textContent = msg;
    dom.fileStatus.classList.remove('hidden');
    dom.fileStatus.style.color = isError ? '#ef4444' : '#4ade80';
    dom.fileStatus.style.borderColor = isError ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)';
    dom.fileStatus.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)';
}

function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                const nameKeys = ['שם', 'שם מלא', 'name', 'Name', 'NAME', 'שם פרטי'];
                const phoneKeys = ['טלפון', 'נייד', 'מספר', 'phone', 'Phone', 'PHONE', 'tel', 'mobile'];
                const qtyKeys = ['כמות', 'quantity', 'Quantity', 'QUANTITY', 'מספר כרטיסים', 'כרטיסים'];

                const findCol = (row, keys) => {
                    for (const k of keys) {
                        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
                    }
                    return null;
                };

                const participants = [];
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const name = findCol(row, nameKeys);
                    const phone = findCol(row, phoneKeys);
                    const rawQty = findCol(row, qtyKeys);
                    const quantity = parseInt(rawQty) || 0;
                    if (!name && !phone) continue;
                    participants.push({
                        name: name ? String(name).trim() : '',
                        phone: phone ? String(phone).trim() : '',
                        quantity: quantity,
                        remainingSelections: quantity > 0 ? quantity : Infinity
                    });
                }
                resolve(participants);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ───────── Background Controls ─────────
function setupBackgroundControls() {
    const radios = document.querySelectorAll('input[name="bg-type"]');
    radios.forEach(r => {
        r.addEventListener('change', () => {
            state.bgType = r.value;
            updateBgSections();
            applyBackground();
            saveState();
        });
    });

    dom.bgColorPicker.addEventListener('input', () => {
        state.bgColor = dom.bgColorPicker.value;
        applyBackground();
        saveState();
    });

    dom.videoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (state.videoObjectURL) URL.revokeObjectURL(state.videoObjectURL);
        state.videoObjectURL = URL.createObjectURL(file);
        dom.bgVideo.src = state.videoObjectURL;
        dom.clearVideoBtn.classList.remove('hidden');
        applyBackground();
    });

    dom.clearVideoBtn.addEventListener('click', () => {
        if (state.videoObjectURL) URL.revokeObjectURL(state.videoObjectURL);
        state.videoObjectURL = null;
        dom.bgVideo.src = '';
        dom.bgVideo.classList.remove('active');
        dom.clearVideoBtn.classList.add('hidden');
    });

    dom.imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (state.imageObjectURL) URL.revokeObjectURL(state.imageObjectURL);
        state.imageObjectURL = URL.createObjectURL(file);
        dom.bgImage.src = state.imageObjectURL;
        dom.clearImageBtn.classList.remove('hidden');
        applyBackground();
    });

    dom.clearImageBtn.addEventListener('click', () => {
        if (state.imageObjectURL) URL.revokeObjectURL(state.imageObjectURL);
        state.imageObjectURL = null;
        dom.bgImage.src = '';
        dom.bgImage.classList.remove('active');
        dom.clearImageBtn.classList.add('hidden');
    });
}

function updateBgSections() {
    dom.bgColorSection.classList.toggle('hidden', state.bgType !== 'color');
    dom.bgVideoSection.classList.toggle('hidden', state.bgType !== 'video');
    dom.bgImageSection.classList.toggle('hidden', state.bgType !== 'image');
}

function applyBackground() {
    dom.bgVideo.classList.remove('active');
    dom.bgImage.classList.remove('active');

    switch (state.bgType) {
        case 'color':
            document.body.style.background = state.bgColor;
            break;
        case 'video':
            document.body.style.background = '#000';
            if (state.videoObjectURL || dom.bgVideo.src) dom.bgVideo.classList.add('active');
            break;
        case 'image':
            document.body.style.background = '#000';
            if (state.imageObjectURL || dom.bgImage.src) dom.bgImage.classList.add('active');
            break;
    }
}

// ───────── First Visit Tooltip ─────────
function showFirstVisitTooltip() {
    const KEY = 'raffle_first_visit_done';
    if (localStorage.getItem(KEY)) return;

    const tooltip = dom.firstVisitTooltip;
    tooltip.classList.remove('hidden');

    // Fade in after a small delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });
    });

    // Auto-dismiss after 4 seconds
    const dismiss = () => {
        tooltip.classList.remove('visible');
        setTimeout(() => tooltip.classList.add('hidden'), 500);
        localStorage.setItem(KEY, '1');
        document.removeEventListener('keydown', dismiss);
        document.removeEventListener('click', dismiss);
    };

    setTimeout(dismiss, 4000);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('click', dismiss);
}

// ───────── Sound System ─────────
function initSounds() {
    try {
        state.buzzerSound = new Audio('sounds/Buzzer1.mp3');
        state.buzzerSound.volume = 0.7;
        state.buzzerSound.preload = 'auto';
        state.buzzerSound.addEventListener('error', () => { state.buzzerSound = null; });
    } catch (e) {
        state.buzzerSound = null;
    }

    const initAC = () => {
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        document.removeEventListener('click', initAC);
        document.removeEventListener('keydown', initAC);
    };
    document.addEventListener('click', initAC);
    document.addEventListener('keydown', initAC);
}

function playTickSound() {
    if (!state.audioContext || !state.soundEnabled) return;
    try {
        const ctx = state.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600 + Math.random() * 300;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.025);
    } catch (e) { /* ignore */ }
}

function playBuzzerSound() {
    if (!state.soundEnabled) return;
    if (state.buzzerSound) {
        state.buzzerSound.currentTime = 0;
        state.buzzerSound.play().catch(() => {});
    } else {
        try {
            const ctx = state.audioContext;
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 440;
            osc.type = 'square';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) { /* ignore */ }
    }
}

// ───────── Winner Selection ─────────
function selectRandomWinner() {
    const eligible = [];
    for (let i = 0; i < state.participants.length; i++) {
        if (state.participants[i].remainingSelections > 0) eligible.push(i);
    }
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
}

function getEligibleCount() {
    let count = 0;
    for (let i = 0; i < state.participants.length; i++) {
        if (state.participants[i].remainingSelections > 0) count++;
    }
    return count;
}

function getDisplayText(participant) {
    if (state.displayMode === 'phone') {
        return participant.phone || participant.name || '---';
    }
    return participant.name || participant.phone || '---';
}

// ───────── Shuffle Utility ─────────
function shuffleArray(arr) {
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// Get participant index for a given logical scroll position
// Uses the shuffled array with modulo for infinite cycling
// During deceleration, overrides the winner position
function getParticipantForLogical(logicalIdx) {
    if (logicalIdx === anim.winnerLogicalIdx) {
        return state.targetParticipantIndex;
    }
    const len = anim.shuffled.length;
    if (len === 0) return 0;
    return anim.shuffled[((logicalIdx % len) + len) % len];
}

// ───────── Roulette Animation Engine ─────────

function initPool() {
    dom.strip.innerHTML = '';
    anim.pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
        const el = document.createElement('div');
        el.className = 'roulette-item';
        dom.strip.appendChild(el);
        anim.pool.push(el);
    }
}

function renderPool() {
    const H = state.itemHeight;
    const centerLogical = Math.floor(anim.vPos / H);
    const subOffset = anim.vPos - (centerLogical * H);

    for (let i = 0; i < POOL_SIZE; i++) {
        const logicalIdx = centerLogical + (i - CENTER_OFFSET);
        const pIdx = getParticipantForLogical(logicalIdx);
        anim.pool[i].textContent = getDisplayText(state.participants[pIdx]);
    }

    // Position strip so that CENTER_OFFSET item aligns with viewport center
    // Viewport shows 3 items, center of viewport = 1.5 * H from top
    // We want the center pool item to be at viewport center
    const stripY = -((CENTER_OFFSET) * H + subOffset) + H; // +H to center in 3-item viewport
    dom.strip.style.transform = `translateY(${stripY}px)`;
}

function animationTick() {
    // Move forward
    anim.vPos += anim.vel;

    // Render current state
    renderPool();

    // Tick sound per item
    const H = state.itemHeight;
    const currentLogical = Math.floor(anim.vPos / H);
    if (currentLogical !== state.lastTickIndex) {
        state.lastTickIndex = currentLogical;
        playTickSound();
    }

    // Deceleration physics
    if (state.phase === 'decelerating') {
        const remaining = anim.targetVPos - anim.vPos;

        if (remaining <= 0) {
            // Overshot - snap to target
            anim.vPos = anim.targetVPos;
            renderPool();
            onSpinComplete();
            return;
        }

        // Exponential decay: each frame velocity = 3.5% of remaining distance
        // This gives ~3-4 second deceleration regardless of starting speed
        anim.vel = Math.max(0.3, remaining * 0.035);

        // Snap when very close
        if (remaining < 1) {
            anim.vPos = anim.targetVPos;
            renderPool();
            onSpinComplete();
            return;
        }
    }

    state.animationId = requestAnimationFrame(animationTick);
}

function startSpin() {
    // Hide winner announcement
    dom.winnerAnnouncement.classList.add('hidden');

    // Select winner
    const winnerIdx = selectRandomWinner();
    if (winnerIdx === null) return;
    state.targetParticipantIndex = winnerIdx;

    // Shuffle for spinning display
    const indices = [];
    for (let i = 0; i < state.participants.length; i++) indices.push(i);
    anim.shuffled = shuffleArray(indices);

    // Reset animation state
    anim.vPos = 0;
    anim.vel = 40; // ~2400 px/sec at 60fps
    anim.winnerLogicalIdx = -1; // Not set until deceleration
    state.lastTickIndex = -1;
    state.phase = 'spinning';

    // Build pool
    initPool();
    renderPool();

    // Start loop
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.animationId = requestAnimationFrame(animationTick);
}

function beginDeceleration() {
    if (state.phase !== 'spinning') return;
    state.phase = 'decelerating';

    const H = state.itemHeight;
    const currentLogical = Math.floor(anim.vPos / H);

    // Place winner 40 items ahead (gives a nice ~3-4 second deceleration)
    const DECEL_DISTANCE = 40;
    anim.winnerLogicalIdx = currentLogical + DECEL_DISTANCE;
    anim.targetVPos = anim.winnerLogicalIdx * H;
}

function onSpinComplete() {
    state.phase = 'stopped';
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }

    // Play buzzer
    playBuzzerSound();

    // Get winner
    const winner = state.participants[state.targetParticipantIndex];

    // Highlight center pool element
    const centerEl = anim.pool[CENTER_OFFSET];
    if (centerEl) {
        centerEl.style.color = '#FFD700';
        centerEl.style.textShadow = '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4)';
    }

    // Show winner announcement
    dom.winnerNameDisplay.textContent = getDisplayText(winner);
    dom.winnerAnnouncement.classList.remove('hidden');

    // Update remaining selections
    if (!state.allowReselect || winner.quantity > 0) {
        winner.remainingSelections--;
    }

    // Record winner
    state.drawCount++;
    state.winners.unshift({
        name: winner.name,
        phone: winner.phone,
        timestamp: Date.now(),
        drawNumber: state.drawCount
    });

    saveState();
    renderWinnersList();
}

// ───────── UI Updates ─────────
function renderWinnersList() {
    dom.winnersCount.textContent = state.winners.length;

    if (state.winners.length === 0) {
        dom.winnersList.innerHTML = '<div class="no-winners-msg">עדיין אין זוכים</div>';
        return;
    }

    // Render first 200 for performance
    const visible = state.winners.slice(0, 200);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < visible.length; i++) {
        const w = visible[i];
        const entry = document.createElement('div');
        entry.className = 'winner-entry';

        const num = document.createElement('div');
        num.className = 'winner-number';
        num.textContent = w.drawNumber;

        const info = document.createElement('div');
        info.className = 'winner-info';

        const name = document.createElement('div');
        name.className = 'winner-name';
        name.textContent = w.name || w.phone;
        info.appendChild(name);

        if (w.phone && w.name) {
            const phone = document.createElement('div');
            phone.className = 'winner-phone';
            phone.textContent = w.phone;
            info.appendChild(phone);
        }

        const time = document.createElement('div');
        time.className = 'winner-time';
        time.textContent = new Date(w.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        entry.appendChild(num);
        entry.appendChild(info);
        entry.appendChild(time);
        fragment.appendChild(entry);
    }

    dom.winnersList.innerHTML = '';
    dom.winnersList.appendChild(fragment);
}

// ───────── Export / Reset ─────────
function exportWinnersCSV() {
    if (state.winners.length === 0) {
        alert('אין זוכים לייצוא');
        return;
    }

    const BOM = '\uFEFF';
    const header = 'מספר הגרלה,שם,טלפון,זמן\n';
    const rows = state.winners.map(w =>
        `${w.drawNumber},"${w.name}","${w.phone}","${new Date(w.timestamp).toLocaleString('he-IL')}"`
    ).join('\n');

    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raffle_winners_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetWinners() {
    state.winners = [];
    state.drawCount = 0;
    state.phase = 'idle';

    for (let i = 0; i < state.participants.length; i++) {
        const p = state.participants[i];
        p.remainingSelections = p.quantity > 0 ? p.quantity : Infinity;
    }

    dom.strip.innerHTML = '';
    dom.winnerAnnouncement.classList.add('hidden');

    saveState();
    renderWinnersList();
}

function resetAll() {
    state.participants = [];
    state.winners = [];
    state.drawCount = 0;
    state.phase = 'idle';

    dom.strip.innerHTML = '';
    dom.winnerAnnouncement.classList.add('hidden');
    dom.fileUploadArea.classList.remove('has-file');
    dom.fileStatus.classList.add('hidden');
    dom.excelFileInput.value = '';

    saveState();
    renderWinnersList();
}

// ───────── Demo Data Generator ─────────
function generateDemoData(count) {
    const firstNames = [
        'אבי','אברהם','אדם','אהרון','אופיר','אור','אורי','אושר','אייל','אילן',
        'אלון','אלי','אליהו','אמיר','אריאל','ארז','אשר','בועז','בן','בנימין',
        'גבריאל','גד','גדעון','גיא','גיל','גלעד','דוד','דור','דין','דניאל',
        'הראל','הרצל','זיו','חגי','חיים','חנן','טל','טום','יאיר','יגאל',
        'יהונתן','יהודה','יואב','יוגב','יוחאי','יונתן','יוסי','יוסף','יובל','יצחק',
        'ישי','ישראל','כפיר','לאון','ליאור','ליאם','לירון','לירז','מאור','מיכאל',
        'מנחם','משה','מתן','נדב','נהוראי','ניב','ניר','נעם','נתן','נתנאל',
        'סהר','עדי','עוז','עומר','עופר','עידן','עידו','עמית','עמרי','ערן',
        'פלג','צבי','צחי','קובי','רון','רועי','רז','רם','רפאל','שגיא',
        'שי','שחר','שלומי','שלמה','שמואל','שמעון','תום','תומר','תמיר',
        'אביגיל','אבישג','אדוה','אופל','אורית','אורלי','אילנית','איריס','אלה','אמילי',
        'אסתר','אפרת','אריאלה','בר','ברכה','גל','גלי','גלית','דבורה','דנה',
        'דנית','דפנה','הגר','הדס','הדר','הילה','הלל','ורד','זהבה','חגית',
        'חנה','טובה','טלי','יאל','ידידה','יהודית','יוכבד','יעל','יפה','יפעת',
        'ירדן','כרמל','כרמית','לאה','לי','ליאת','לימור','לינוי','ליעד','מאיה',
        'מור','מורן','מוריה','מיכל','מירב','מרים','נגה','נוגה','נוי','נועה',
        'נועם','נופר','נורית','סיגל','סיון','סמדר','עדי','עדינה','עליזה','ענבל',
        'ענת','עפרה','פנינה','צפורה','קרן','רבקה','רויטל','רונית','רות','רחל',
        'ריטה','רינת','שולמית','שושנה','שי','שיר','שירה','שירלי','שלומית','שני',
        'שרה','שרון','תאיר','תהילה','תמר','תמרה'
    ];
    const lastNames = [
        'כהן','לוי','מזרחי','פרץ','ביטון','דהן','אברהם','פרידמן','אזולאי','שרביט',
        'אדרי','מלכה','דוד','בן דוד','חיים','עמר','יוסף','גבאי','בן שמעון','מימון',
        'שלום','בר','רוזנברג','קפלן','ברק','גולדשטיין','ויצמן','שפירא','בן חיים','נגר',
        'גולדברג','שטרן','ברגר','הלוי','אלון','ברנשטיין','וולף','רבינוביץ','קליין','פישר',
        'גרינברג','הורוביץ','שוורץ','לנדאו','ויס','ליבוביץ','שגב','רון','זהבי','סויסה',
        'אוחיון','חדד','טובי','סבג','אלבז','בנימין','אשכנזי','ספרדי','שמש','אליהו',
        'חזן','מרדכי','ישראלי','בראון','גרין','שמואלי','אבוטבול','סלומון','מרציאנו','בכר',
        'אמסלם','טל','אפרים','קדוש','סימן טוב','מגן','עטיה','אלימלך','אוזן','צדוק',
        'סרוסי','חמו','בוזגלו','אלקיים','מסעוד','חביב','ששון','נחמיאס','אופיר','גל',
        'נתן','סעדון','יחזקאל','חורי','נאור','בניון','אורן','יערי','שאול','אלמוג'
    ];
    const prefixes = ['050','052','053','054','055','058'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const results = [];

    for (let i = 0; i < count; i++) {
        const name = pick(firstNames) + ' ' + pick(lastNames);
        const phone = pick(prefixes) + String(Math.floor(1000000 + Math.random() * 9000000));
        const r = Math.random();
        const qty = r < 0.7 ? 0 : (r < 0.9 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 7) + 4);
        results.push({
            name,
            phone,
            quantity: qty,
            remainingSelections: qty > 0 ? qty : Infinity
        });
    }
    return results;
}
