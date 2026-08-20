// ============================================================
// Cart Badge — shows number of items on the cart icon
// Include this script on any page with a trolley.png link
// ============================================================
(function() {
    // Find the cart link (contains trolley.png)
    const cartLink = document.querySelector('a[href*="cart.html"]');
    if (!cartLink) return;

    // Make the link position relative for badge positioning
    cartLink.style.position = 'relative';

    // Create badge element
    const badge = document.createElement('span');
    badge.className = 'cart-count-badge';
    badge.textContent = '0';
    badge.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ec4899;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        border-radius: 50%;
        display: none;
    `;
    cartLink.appendChild(badge);

    // Fetch cart count from API
    fetch('../CART/cart_api.php')
        .then(r => r.json())
        .then(data => {
            if (data.success && data.items && data.items.length > 0) {
                const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);
                badge.textContent = totalQty;
                badge.style.display = 'block';
            }
        })
        .catch(() => {});
})();
