// ============================================================
// Admin Session — include on all admin pages
// 1. Checks if user is logged in (redirects to login if not)
// 2. Updates the owner-tag to show the logged-in role
// 3. Adds logout dropdown on avatar click
// ============================================================

(function() {
    // Check session
    fetch('../Registration/check_session.php')
        .then(r => r.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = '../Registration/LogInPage.html';
                return;
            }
            // Update owner-tag text with role
            const ownerTag = document.querySelector('.owner-tag');
            if (ownerTag && data.role) {
                const span = ownerTag.querySelector('span');
                if (span) span.textContent = data.role.charAt(0).toUpperCase() + data.role.slice(1);
            }
        })
        .catch(() => {});

    // Back-button protection
    window.addEventListener('pageshow', function(e) {
        if (e.persisted) window.location.reload();
    });

    // Add logout dropdown to owner-tag
    document.addEventListener('DOMContentLoaded', function() {
        const ownerTag = document.querySelector('.owner-tag');
        if (!ownerTag) return;

        // Make it clickable
        ownerTag.style.position = 'relative';
        ownerTag.style.cursor = 'pointer';

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'admin-logout-dropdown';
        dropdown.innerHTML = '<a href="#" class="admin-logout-link">LOG OUT</a>';
        ownerTag.appendChild(dropdown);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .admin-logout-dropdown {
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                background: #fff;
                border: 1px solid #ec4899;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                padding: 6px 0;
                z-index: 1000;
                min-width: 120px;
            }
            .owner-tag.open .admin-logout-dropdown { display: block; }
            .admin-logout-link {
                display: block;
                padding: 10px 18px;
                color: #ef4444 !important;
                font-weight: 700;
                font-size: 13px;
                text-decoration: none !important;
            }
            .admin-logout-link:hover { background: #fff0f3; }
        `;
        document.head.appendChild(style);

        // Toggle on click
        ownerTag.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('open');
        });

        document.addEventListener('click', function() {
            ownerTag.classList.remove('open');
        });

        // Logout confirmation
        dropdown.querySelector('.admin-logout-link').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = '../Registration/logout.php';
            }
        });
    });
})();
