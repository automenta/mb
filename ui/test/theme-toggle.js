// Select the toggle button and the stylesheet link element
const themeToggleButton = document.getElementById('theme-toggle');
const themeStylesheet = document.getElementById('theme-stylesheet');

// Set up the theme toggle logic
themeToggleButton.addEventListener('click', () => {
    if (themeStylesheet.getAttribute('href') === '../css/light-mode.css') {
        themeStylesheet.setAttribute('href', '../css/dark-mode.css');
        themeToggleButton.textContent = 'Switch to Light Mode';
    } else {
        themeStylesheet.setAttribute('href', '../css/light-mode.css');
        themeToggleButton.textContent = 'Switch to Dark Mode';
    }
});
