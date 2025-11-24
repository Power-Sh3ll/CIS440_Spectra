// Navbar Component - Reusable navigation for all pages
class SpectraNavbar {
    constructor() {
        this.token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('profile')) return 'profile';
        if (path.includes('leaderboard')) return 'leaderboard';
        if (path.includes('friends')) return 'friends';
        if (path.includes('footprint')) return 'footprint';
        if (path.includes('settings')) return 'settings';
        return 'home';
    }

    init() {
        this.createNavbar();
        this.attachEventListeners();
    }

    createNavbar() {
        // Create navbar HTML
        const navbarHTML = `
            <nav class="spectra-navbar" id="spectra-navbar">
                <div class="navbar-container">
                    <div class="navbar-brand">
                        <img src="/Assets/Logo.png" alt="Spectra Logo" class="navbar-logo">
                        <span class="navbar-title">Spectra</span>
                    </div>
                    
                    <div class="navbar-menu" id="navbar-menu">
                        <a href="/dashboard" class="navbar-item ${this.currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
                            Dashboard
                        </a>
                        <a href="/profile" class="navbar-item ${this.currentPage === 'profile' ? 'active' : ''}" data-page="profile">
                            Profile
                        </a>
                        <a href="/leaderboard" class="navbar-item ${this.currentPage === 'leaderboard' ? 'active' : ''}" data-page="leaderboard">
                            Leaderboard
                        </a>
                        <a href="/friends" class="navbar-item ${this.currentPage === 'friends' ? 'active' : ''}" data-page="friends">
                            Friends
                        </a>
                        <a href="/footprint" class="navbar-item ${this.currentPage === 'footprint' ? 'active' : ''}" data-page="footprint">
                            Activity
                        </a>
                        <a href="/settings" class="navbar-item ${this.currentPage === 'settings' ? 'active' : ''}" data-page="settings">
                            Settings
                        </a>
                    </div>
                    
                    <div class="navbar-actions">
                        <button class="navbar-theme-toggle" id="navbar-theme-toggle" title="Toggle theme (Ctrl+Shift+T)">
                            🌙
                        </button>
                        <button class="navbar-logout" id="navbar-logout">Logout</button>
                        <button class="navbar-toggle" id="navbar-toggle">
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </nav>
        `;

        // Insert navbar at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
        
        // Add body class for navbar spacing
        document.body.classList.add('has-navbar');
    }

    updateThemeToggleIcon() {
        const themeToggleBtn = document.getElementById('navbar-theme-toggle');
        if (!themeToggleBtn || !window.themeManager) return;

        const currentTheme = window.themeManager.getCurrentTheme();
        const effectiveTheme = window.themeManager.getEffectiveTheme();
        
        // Update icon based on current theme
        let icon = '🌙'; // Default dark mode icon
        let title = 'Switch to dark mode';
        
        if (currentTheme === 'dark') {
            icon = '☀️';
            title = 'Switch to light mode';
        } else if (currentTheme === 'auto') {
            icon = '🔄';
            title = 'Auto theme (click to switch)';
        }
        
        themeToggleBtn.textContent = icon;
        themeToggleBtn.title = title;
    }

    attachEventListeners() {
        // Theme toggle functionality
        const themeToggleBtn = document.getElementById('navbar-theme-toggle');
        if (themeToggleBtn && window.themeManager) {
            this.updateThemeToggleIcon();
            
            themeToggleBtn.addEventListener('click', () => {
                window.themeManager.toggleTheme();
            });

            // Listen for theme changes to update icon
            window.addEventListener('themeChanged', () => {
                this.updateThemeToggleIcon();
            });
        }

        // Logout functionality
        const logoutBtn = document.getElementById('navbar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('token');
                window.location.href = '/';
            });
        }

        // Mobile menu toggle
        const toggleBtn = document.getElementById('navbar-toggle');
        const menu = document.getElementById('navbar-menu');
        if (toggleBtn && menu) {
            toggleBtn.addEventListener('click', () => {
                menu.classList.toggle('active');
                toggleBtn.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking nav items
        const navItems = document.querySelectorAll('.navbar-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (menu) {
                    menu.classList.remove('active');
                }
                if (toggleBtn) {
                    toggleBtn.classList.remove('active');
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const navbar = document.getElementById('spectra-navbar');
            if (navbar && !navbar.contains(e.target)) {
                if (menu) menu.classList.remove('active');
                if (toggleBtn) toggleBtn.classList.remove('active');
            }
        });
    }
}

// Initialize navbar when DOM is loaded, but only if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    const isLoginPage = window.location.pathname === '/' || window.location.pathname.includes('logon');
    
    // Only show navbar on authenticated pages
    if (token && !isLoginPage) {
        new SpectraNavbar();
    }
});