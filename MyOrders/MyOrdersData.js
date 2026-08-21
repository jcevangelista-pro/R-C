// Orders loaded from database
let orders = [];

async function loadMyOrders() {
    try {
        const res = await fetch('myorders_api.php');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        // Flatten: each order item becomes a row
        orders = [];
        data.orders.forEach(order => {
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    orders.push({
                        order_id: order.order_id,
                        name: item.name,
                        category: item.category || '',
                        price: parseFloat(item.price),
                        qty: parseInt(item.qty),
                        image: item.image_path || null,
                        status: order.display_status,
                        order_status: order.order_status,
                        date_requested: order.date_requested,
                        time_requested: order.time_requested
                    });
                });
            } else {
                // Order with no items yet (unlikely but handle gracefully)
                orders.push({
                    order_id: order.order_id,
                    name: '—',
                    category: '',
                    price: parseFloat(order.total_amount),
                    qty: 1,
                    image: null,
                    status: order.display_status,
                    order_status: order.order_status,
                    date_requested: order.date_requested,
                    time_requested: order.time_requested
                });
            }
        });

        if (typeof renderOrderRows === 'function') {
            renderOrderRows();
        }
    } catch (err) {
        const wrap = document.getElementById('orderRows');
        if (wrap) wrap.innerHTML = `<div style="text-align:center;color:#ef4444;padding:24px;">Failed to load orders: ${err.message}</div>`;
    }
}

loadMyOrders();
