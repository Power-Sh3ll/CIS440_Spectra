// Footer Component - Reusable footer for all pages
class SpectraFooter {
    constructor() {
        this.init();
    }

    init() {
        this.createFooter();
    }

    createFooter() {
        const footerHTML = `
            <footer class="spectra-footer" id="spectra-footer">
                <div class="footer-container">
                    <div class="footer-content">
                        <div class="footer-brand">
                            <img src="/Assets/Logo.png" alt="Spectra Logo" class="footer-logo">
                            <span class="footer-title">Spectra</span>
                        </div>
                        
                        <div class="footer-info">
                            <p>&copy; ${new Date().getFullYear()} Spectra. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        `;

        // Insert footer at the end of body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
        
        // Add body class for footer spacing
        document.body.classList.add('has-footer');
    }
}

// Initialize footer when DOM is loaded, but only if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    const isLoginPage = window.location.pathname === '/' || window.location.pathname.includes('logon');
    
    // Only show footer on authenticated pages
    if (token && !isLoginPage) {
        new SpectraFooter();
    }
});