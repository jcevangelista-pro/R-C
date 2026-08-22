// ============================================================
// Cart, Notification & Order Badges + Mobile Nav
// Include on all customer-facing pages
// ============================================================
(function() {
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
                var count = (data.success && data.orders) ? data.orders.length : 0;
                badge.textContent = count;
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
