// Remote Control Settings Helper
// Handles max attempts slider functionality

function setupMaxAttemptsControl() {
    const attemptsSlider = document.getElementById('max-player-attempts');
    const attemptsValue = document.getElementById('max-attempts-value');
    const attemptsText = document.getElementById('max-attempts-text');

    if (attemptsSlider && attemptsValue && attemptsText) {
        // טען ערך שמור או ברירת מחדל
        const savedValue = localStorage.getItem('maxPlayerAttempts') || '3';
        attemptsSlider.value = savedValue;
        attemptsValue.textContent = savedValue;
        attemptsText.textContent = savedValue;

        console.log(`🎮 מספר נסיונות לשחקן נטען: ${savedValue}`);

        // עדכן בזמן אמת
        attemptsSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            attemptsValue.textContent = value;
            attemptsText.textContent = value;
            localStorage.setItem('maxPlayerAttempts', value);
            console.log(`🎮 מספר נסיונות לשחקן עודכן: ${value}`);
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Only run on main page (not controller)
    if (!window.location.pathname.includes('controller.html')) {
        setupMaxAttemptsControl();
    }
});
