// Authentication Functions

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('aurahub_token');
        this.user = null;
        this.init();
    }

    init() {
        if (this.token) {
            this.loadUser();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login(e.target);
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register(e.target);
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    }

    async login(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.user = result.data.user;
                localStorage.setItem('aurahub_token', this.token);
                window.location.href = '/';
            } else {
                alert(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async register(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (data.password !== data.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('Registration successful! Please login.');
                window.location.href = '/login';
            } else {
                alert(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        }
    }

    async loadUser() {
        try {
            const response = await fetch('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.data;
                this.updateUI();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('aurahub_token');
        this.token = null;
        this.user = null;
        window.location.href = '/login';
    }

    updateUI() {
        if (!this.user) return;

        document.querySelector('.topbar-profile .username')?.textContent = this.user.username;
        document.querySelector('.topbar-profile .role')?.textContent = this.user.role;

        // Update role-based UI elements
        if (this.user.role === 'admin') {
            document.querySelector('[href="/admin"]')?.style.display = '';
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    hasRole(roles) {
        if (!this.user) return false;
        return roles.includes(this.user.role);
    }
}

// Initialize auth manager
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();

    // Protect routes
    const protectedPages = ['/dashboard', '/scripts', '/loaders', '/users', '/logs', '/admin', '/settings'];
    const currentPath = window.location.pathname;

    if (protectedPages.includes(currentPath)) {
        if (!authManager.isAuthenticated()) {
            window.location.href = '/login';
        }
    }
});