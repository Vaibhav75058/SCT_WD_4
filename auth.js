import {
    auth,
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged
} from './firebase-config.js';

// Handle Auth View Switching
window.switchView = function (viewId) {
    document.querySelectorAll('.auth-view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        targetView.style.animation = 'none';
        targetView.offsetHeight; /* trigger reflow */
        targetView.style.animation = 'fadeIn 0.4s ease-out';
    }
};

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'app.html';
    }
});

// Advanced Toast Notification
const showToast = (message, type = 'error') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

    toast.innerHTML = `
        <i class="fas ${icon}" style="color: var(--${type}-color); font-size: 1.25rem;"></i>
        <div>
            <h5 style="margin-bottom: 0.25rem; font-size: 0.875rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</h5>
            <p style="font-size: 0.75rem; color: var(--text-secondary);">${message}</p>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Handle Login
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showToast('Please enter both email and password.');
            return;
        }

        try {
            loginBtn.textContent = 'Signing In...';
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle redirect
        } catch (error) {
            showToast(error.message);
            loginBtn.textContent = 'Sign In';
        }
    });
}

// Handle Sign Up
const signupBtn = document.getElementById('signup-btn');
if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const email = document.getElementById('new-email').value;
        const password = document.getElementById('new-password').value;
        const name = document.getElementById('new-name').value;

        if (!email || !password || !name) {
            showToast('Please fill out all fields.');
            return;
        }

        try {
            signupBtn.textContent = 'Creating Account...';
            await createUserWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle redirect
        } catch (error) {
            showToast(error.message);
            signupBtn.textContent = 'Sign Up';
        }
    });
}

// Handle Google Login
const googleLoginBtn = document.getElementById('google-login-btn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged will handle redirect
        } catch (error) {
            showToast(error.message);
        }
    });
}

// Prevent default form submits
document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => e.preventDefault());
    });
});
