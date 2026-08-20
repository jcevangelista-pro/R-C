// Cart items loaded from database
let cartItems = [];

async function loadCartFromDB() {
    try {
        const res = await fetch('cart_api.php');
        const data = await res.json();
        if (!data.success) return;

        cartItems = data.items.map(item => ({
            cart_id: item.cart_id,
            product_id: item.product_id,
            name: item.name,
            category: item.category || '',
            price: item.price,
            qty: item.quantity,
            image: item.image_path || null,
            designSelection: 'upload',
            orderType: 'normal',
            description: '',
            photo: null
        }));

        if (typeof renderCartRows === 'function') {
            renderCartRows();
        }
    } catch (err) {
        console.error('Failed to load cart:', err);
    }
}

loadCartFromDB();
