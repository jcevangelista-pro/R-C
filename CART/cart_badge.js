// ============================================================
// Cart, Notification & Order Badges + Mobile Nav
// Include on all customer-facing pages
// ============================================================
(function() {
    var sessionState = { checked: false, loggedIn: false };

    function showGuestPrompt() {
        var existing = document.getElementById('guestAccessPrompt');
        if (existing) {
            existing.hidden = false;
            existing.querySelector('.guest-access-signup').focus();
            return;
        }
        var overlay = document.createElement('div');
        overlay.id = 'guestAccessPrompt';
        overlay.className = 'guest-access-overlay';
        overlay.innerHTML = `
            <div class="guest-access-dialog" role="dialog" aria-modal="true" aria-labelledby="guestAccessTitle">
                <button type="button" class="guest-access-close" aria-label="Close">&times;</button>
                <div class="guest-access-icon" aria-hidden="true">!</div>
                <h2 id="guestAccessTitle">Account required</h2>
                <p>You must sign up first to add or order products and access your profile, notifications, cart, or orders.</p>
                <div class="guest-access-actions">
                    <a class="guest-access-login" href="../Registration/LogInPage.html">Log In</a>
                    <a class="guest-access-signup" href="../Registration/SignUpPage.html">Sign Up</a>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        var close = function() { overlay.hidden = true; };
        overlay.querySelector('.guest-access-close').addEventListener('click', close);
        overlay.addEventListener('click', function(event) { if (event.target === overlay) close(); });
        overlay.querySelector('.guest-access-signup').focus();
    }

    function syncGuestNavigation() {
        var dropdown = document.getElementById('userDropdown') || document.querySelector('.UserDropdown');
        if (dropdown) {
            dropdown.innerHTML = '<a href="../Registration/LogInPage.html">Log In</a><a href="../Registration/SignUpPage.html">Sign Up</a>';
        }
        document.querySelectorAll('.nav-badge').forEach(function(badge) { badge.hidden = true; });
    }

    function isProtectedTarget(target) {
        var link = target.closest('a');
        var href = link ? (link.getAttribute('href') || '').toLowerCase() : '';
        var protectedLink = /(?:profile\/profilepage|notifications\/notifications|cart\/cart|myorders\/myorder)\.html/.test(href);
        var purchaseControl = target.closest('#OpenModal, .AddToCartBtn, .btn-add-cart');
        return protectedLink || Boolean(purchaseControl);
    }

    document.addEventListener('click', function(event) {
        if (!sessionState.checked || sessionState.loggedIn || !isProtectedTarget(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showGuestPrompt();
    }, true);

    fetch('../Registration/check_session.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            sessionState.checked = true;
            sessionState.loggedIn = Boolean(data.logged_in);
            if (!sessionState.loggedIn) {
                syncGuestNavigation();
                setTimeout(syncGuestNavigation, 250);
                var path = window.location.pathname.toLowerCase();
                if (/(?:\/profile\/profilepage|\/notifications\/notifications|\/cart\/cart|\/myorders\/myorder)\.html$/.test(path)) {
                    showGuestPrompt();
                }
            }
        })
        .catch(function() {
            sessionState.checked = true;
            sessionState.loggedIn = false;
            syncGuestNavigation();
        });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        .nav-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #ef4444;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            min-width: 16px;
            height: 16px;
            line-height: 16px;
            text-align: center;
            border-radius: 50%;
            display: block;
        }
        .nav-badge[hidden] { display: none; }
        .Navbar ul li a.ActiveLink {
            position: relative;
            font-weight: bold;
        }
        .Navbar ul li a.ActiveLink::after {
            content: '';
            position: absolute;
            left: 12px;
            right: 12px;
            bottom: 2px;
            height: 3px;
            background: #a78bfa;
            border-radius: 2px;
        }
        .mobile-nav-divider { border-top: 1px solid #f3f4f6; margin: 4px 0; }
        .guest-access-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, .58);
        }
        .guest-access-overlay[hidden] { display: none; }
        .guest-access-dialog {
            position: relative;
            width: min(430px, 100%);
            padding: 30px;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 20px 60px rgba(15, 23, 42, .3);
            text-align: center;
        }
        .guest-access-dialog h2 { margin: 0 0 8px; color: #1e3263; font: 800 22px Poppins, sans-serif; }
        .guest-access-dialog p { margin: 0; color: #64748b; font: 500 14px/1.55 Poppins, sans-serif; }
        .guest-access-close { position: absolute; top: 9px; right: 14px; border: 0; color: #64748b; background: transparent; font-size: 28px; cursor: pointer; }
        .guest-access-icon { display: grid; place-items: center; width: 48px; height: 48px; margin: 0 auto 14px; border-radius: 50%; color: #b45309; background: #fef3c7; font: 800 24px Poppins, sans-serif; }
        .guest-access-actions { display: flex; justify-content: center; gap: 10px; margin-top: 24px; }
        .guest-access-actions a { min-width: 120px; padding: 10px 18px; border-radius: 9px; font: 700 13px Poppins, sans-serif; text-decoration: none; }
        .guest-access-login { border: 1px solid #cbd5e1; color: #334155; background: #fff; }
        .guest-access-signup { border: 1px solid #ec4899; color: #fff; background: #ec4899; }

        @media (max-width: 768px) {
            .Navbar { padding: 8px 12px !important; overflow: visible !important; }
            .Navbar #BName { font-size: 1rem !important; }
            .Navbar ul { gap: 6px !important; overflow: visible !important; }
            .Navbar a { padding: 6px 8px !important; font-size: 12px !important; }
            .Img { width: 20px !important; height: 20px !important; }
            .nav-badge { top: -4px; right: -4px; font-size: 9px; min-width: 14px; height: 14px; line-height: 14px; }
            .user-menu-item, .cart-icon-item:last-of-type { overflow: visible !important; position: relative !important; }
        }
        @media (max-width: 600px) {
            .Navbar { padding: 6px 8px !important; }
            .Navbar #BName { font-size: 0.85rem !important; }
            .Navbar ul { gap: 3px !important; }
            .Navbar a { padding: 5px 5px !important; font-size: 11px !important; }
            .Img { width: 18px !important; height: 18px !important; }
            .mobile-hide-text { display: none !important; }
            .guest-access-dialog { padding: 28px 18px 20px; }
            .guest-access-actions { flex-direction: column-reverse; }
            .guest-access-actions a { width: 100%; }
        }
    `;
    document.head.appendChild(style);

    // ── Mobile Nav: hide text links, add to user dropdown ────
    function setupMobileNav() {
        const navItems = document.querySelectorAll('.Navbar ul > li');
        navItems.forEach(function(li) {
            const link = li.querySelector('a');
            if (!link) return;
            const text = link.textContent.trim();
            const hasImg = link.querySelector('img');
            if (!hasImg && ['HOME', 'PRODUCTS', 'PORTFOLIO'].includes(text)) {
                li.classList.add('mobile-hide-text');
            }
        });

        // Find dropdown (static id="userDropdown" or dynamic class="UserDropdown")
        const dropdown = document.getElementById('userDropdown') || document.querySelector('.UserDropdown');
        if (dropdown && !dropdown.querySelector('.mobile-nav-home')) {
            const homeLink = document.createElement('a');
            homeLink.href = '../LandingPage/LandingPage.html';
            homeLink.textContent = 'Home';
            homeLink.className = 'mobile-nav-home';

            const prodLink = document.createElement('a');
            prodLink.href = '../Products/Prodbrowse.html';
            prodLink.textContent = 'Products';

            const portLink = document.createElement('a');
            portLink.href = '../Portfolio/PortfolioPage.html';
            portLink.textContent = 'Portfolio';

            const divider = document.createElement('div');
            divider.className = 'mobile-nav-divider';

            // Insert nav links at the top of dropdown
            const firstChild = dropdown.firstChild;
            dropdown.insertBefore(divider, firstChild);
            dropdown.insertBefore(portLink, divider);
            dropdown.insertBefore(prodLink, portLink);
            dropdown.insertBefore(homeLink, prodLink);
        }
    }

    if (window.innerWidth <= 600) {
        // Delay slightly to let Prodbrowse.js create its dropdown first
        setTimeout(setupMobileNav, 100);
    }
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 600) {
            setupMobileNav();
        } else {
            document.querySelectorAll('.mobile-hide-text').forEach(function(el) { el.classList.remove('mobile-hide-text'); });
        }
    });

    // ── Badges ──────────────────────────────────────────────

    // Cart badge
    var cartLink = document.querySelector('a[href*="cart.html"]');
    if (cartLink) {
        cartLink.style.position = 'relative';
        var cartBadge = document.createElement('span');
        cartBadge.className = 'nav-badge';
        cartBadge.id = 'navCartBadge';
        cartBadge.textContent = '0';
        cartLink.appendChild(cartBadge);
    }

    // Alarm/notification badge
    var alarmImg = document.querySelector('img[src*="Alarm.png"]');
    if (alarmImg) {
        var alarmLink = alarmImg.closest('a') || alarmImg.parentElement;
        alarmLink.style.position = 'relative';
        if (alarmLink.tagName === 'A' && (!alarmLink.getAttribute('href') || alarmLink.getAttribute('href') === '' || alarmLink.getAttribute('href') === '#')) {
            alarmLink.href = '../Notifications/notifications.html';
        }
        var alarmBadge = document.createElement('span');
        alarmBadge.className = 'nav-badge';
        alarmBadge.id = 'navAlarmBadge';
        alarmBadge.textContent = '0';
        alarmLink.appendChild(alarmBadge);
    }

    // Billing/orders badge
    var billingImg = document.querySelector('img[src*="billing.png"]');
    if (billingImg) {
        var billingLink = billingImg.closest('a') || billingImg.parentElement;
        billingLink.style.position = 'relative';
        var billingBadge = document.createElement('span');
        billingBadge.className = 'nav-badge';
        billingBadge.id = 'navBillingBadge';
        billingBadge.textContent = '0';
        billingBadge.hidden = true;
        billingLink.appendChild(billingBadge);
    }

    // Fetch cart count
    fetch('../CART/cart_api.php')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var badge = document.getElementById('navCartBadge');
            if (badge) {
                var totalQty = (data.success && data.items) ? data.items.reduce(function(sum, item) { return sum + item.quantity; }, 0) : 0;
                badge.textContent = totalQty;
            }
        })
        .catch(function() {});

    // Fetch order count
    fetch('../MyOrders/myorders_api.php')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var badge = document.getElementById('navBillingBadge');
            if (badge) {
                var count = (data.success && data.orders)
                    ? data.orders.filter(function(order) {
                        return order.order_status === 'Pending' || order.order_status === 'In Progress';
                    }).length
                    : 0;
                badge.textContent = count;
                badge.hidden = count === 0;
            }
        })
        .catch(function() {});

    // Fetch notification count
    fetch('../Registration/notification_count.php')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var badge = document.getElementById('navAlarmBadge');
            if (badge) {
                badge.textContent = (data.success) ? data.count : 0;
            }
        })
        .catch(function() {});
})();
