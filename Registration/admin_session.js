// ============================================================
// Admin Session — include on all admin pages
// 1. Checks if user is logged in (redirects to login if not)
// 2. Updates the owner-tag to show the logged-in role
// 3. Adds logout dropdown on avatar click
// 4. Forces universal Dashboard-style mobile view across all admin/owner pages
// ============================================================

(function() {
    const userManagementLinks = Array.from(document.querySelectorAll('a[href*="UserSystem"]'));
    const ownerPageGate = document.getElementById('ownerPageGate');

    // Keep owner-only navigation hidden until the session role is known.
    userManagementLinks.forEach(link => {
        link.style.display = 'none';
    });

    // Check session
    fetch('../Registration/check_session.php')
        .then(r => r.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = '../Registration/LogInPage.html';
                return;
            }
            // Block customers from admin pages
            if (data.role === 'customer') {
                window.location.href = '../LandingPage/LandingPage.html';
                return;
            }

            const role = String(data.role || '').toLowerCase();

            // User management is owner-only. Admins cannot expose it through
            // navigation or by manually opening the page URL.
            if (role !== 'owner') {
                userManagementLinks.forEach(link => link.remove());
                if (ownerPageGate) {
                    window.location.replace('../Dashboard/Dashboard.html');
                    return;
                }
            } else {
                userManagementLinks.forEach(link => {
                    link.style.display = '';
                });
                if (ownerPageGate) ownerPageGate.remove();
            }

            // Update owner-tag text with role
            const ownerTag = document.querySelector('.owner-tag');
            if (ownerTag && data.role) {
                const span = ownerTag.querySelector('span');
                if (span) span.textContent = data.role.charAt(0).toUpperCase() + data.role.slice(1);
            }
        })
        .catch(() => {
            // Do not reveal owner-only controls if the session cannot be verified.
            if (ownerPageGate) {
                window.location.replace('../Registration/LogInPage.html');
            }
        });

    // Back-button protection
    window.addEventListener('pageshow', function(e) {
        if (e.persisted) window.location.reload();
    });

    // Add logout dropdown to owner-tag and inject global mobile styles
    document.addEventListener('DOMContentLoaded', function() {
        const ownerTag = document.querySelector('.owner-tag');
        if (ownerTag) {
            // Shared management notification entry. Cancellation alerts inserted by
            // the order workflow appear here for both Admin and Owner accounts.
            const topbarActions = document.createElement('div');
            topbarActions.className = 'admin-topbar-actions';
            ownerTag.parentNode.insertBefore(topbarActions, ownerTag);
            topbarActions.appendChild(ownerTag);
            const notificationLink = document.createElement('a');
            notificationLink.className = 'admin-notification-link';
            notificationLink.href = '../Notifications/notifications-admin.html';
            notificationLink.setAttribute('aria-label', 'View notifications');
            notificationLink.innerHTML = '<img src="../OrderProcess/OrderProcessImgs/Alarm.png" alt=""><span class="admin-notification-badge" hidden></span>';
            topbarActions.insertBefore(notificationLink, ownerTag);

            fetch('../Registration/notification_count.php')
                .then(response => response.json())
                .then(result => {
                    const count = Number(result.count || 0);
                    const badge = notificationLink.querySelector('.admin-notification-badge');
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : String(count);
                        badge.hidden = false;
                    }
                })
                .catch(() => {});

            // Make it clickable
            ownerTag.style.position = 'relative';
            ownerTag.style.cursor = 'pointer';

            // Create dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'admin-logout-dropdown';
            dropdown.innerHTML = '<a href="#" class="admin-logout-link">LOG OUT</a>';
            ownerTag.appendChild(dropdown);

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
        }

        // Add universal Dashboard-style mobile navigation styles across all admin pages
        if (!document.getElementById('adminGlobalMobileStyle')) {
            const style = document.createElement('style');
            style.id = 'adminGlobalMobileStyle';
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
                .admin-topbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-left: auto;
                }
                .admin-notification-link {
                    position: relative;
                    display: grid;
                    place-items: center;
                    width: 38px;
                    height: 38px;
                    flex: 0 0 38px;
                    border-radius: 50%;
                    background: #fff0f6;
                }
                .admin-notification-link img { width: 21px; height: 21px; object-fit: contain; }
                .admin-notification-badge {
                    position: absolute;
                    top: -5px;
                    right: -6px;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 4px;
                    border: 2px solid #fff;
                    border-radius: 10px;
                    color: #fff;
                    background: #dc2626;
                    font: 700 10px/14px Poppins, sans-serif;
                    text-align: center;
                }
                .admin-notification-badge[hidden] { display: none; }

                @media (max-width: 768px) {
                    body {
                        flex-direction: column !important;
                    }
                    .sidebar {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 4px !important;
                        padding: 8px 10px !important;
                        overflow-x: auto !important;
                        overflow-y: hidden !important;
                        -webkit-overflow-scrolling: touch !important;
                        box-sizing: border-box !important;
                    }
                    .brand {
                        padding: 0 10px 0 4px !important;
                        flex: 0 0 auto !important;
                    }
                    .brand img {
                        width: 34px !important;
                        height: 34px !important;
                    }
                    .brand-text {
                        font-size: 12px !important;
                        white-space: nowrap !important;
                    }
                    .nav-label {
                        display: none !important;
                    }
                    .sidebar .nav-item {
                        flex: 0 0 auto !important;
                        padding: 8px 12px !important;
                        font-size: 12px !important;
                        border-radius: 8px !important;
                        white-space: nowrap !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        border-left: 0 !important;
                    }
                    .sidebar .nav-item.active {
                        border-left: 0 !important;
                        border-bottom: 3px solid #ec4899 !important;
                        padding-left: 12px !important;
                    }
                    .sidebar .nav-item span:not(.nav-icon) {
                        display: inline-block !important;
                    }
                    .main {
                        margin-left: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 16px !important;
                        gap: 16px !important;
                        box-sizing: border-box !important;
                    }
                    .topbar {
                        padding: 12px 16px !important;
                    }
                    .topbar h1 {
                        font-size: 26px !important;
                    }
                    .owner-tag {
                        font-size: 16px !important;
                    }
                    .owner-tag img {
                        width: 30px !important;
                        height: 30px !important;
                    }
                    .panel1, .stat-grid {
                        flex-direction: column !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .TContainer {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .ProductCard {
                        width: 100% !important;
                        height: auto !important;
                        min-height: 260px !important;
                    }
                    .PCContainer {
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                    table, .history-table {
                        display: block !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        white-space: nowrap !important;
                        width: 100% !important;
                    }
                }
                @media (max-width: 600px) {
                    .admin-topbar-actions { gap: 8px; }
                    .admin-notification-link { width: 34px; height: 34px; flex-basis: 34px; }
                }
            `;
            document.head.appendChild(style);
        }
    });
})();
