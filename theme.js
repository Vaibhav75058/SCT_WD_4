// Handle theme switching
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlTag = document.documentElement;

// Check for saved theme preference or use OS preference
const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Set theme
const setTheme = (theme) => {
    if (theme === 'dark') {
        htmlTag.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } else {
        htmlTag.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
};

// Initialize theme
setTheme(getPreferredTheme());

// Toggle theme event listener
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlTag.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}
