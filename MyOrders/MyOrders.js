/* ================= MONEY FORMAT ================= */

function money(value) {
    return `₱${Number(value).toFixed(2)}`;
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ================= ORDER TOTAL ================= */

function itemTotal(order) {
    return Number(order.price) * Number(order.qty);
}

/* ================= RENDER MY ORDERS ================= */

function renderOrderRows() {
    const wrap = document.getElementById('orderRows');
    if (!wrap) return;

    const ongoingOrderCount = new Set(
        orders
            .filter(order => order.order_status === 'Pending' || order.order_status === 'In Progress')
            .map(order => order.order_id)
    ).size;

    // Update header count (total orders)
    document.getElementById('cartTitle').textContent = `My Orders (${orders.length})`;

    // Update order badge
    const orderBadge = document.getElementById('orderBadge');
    if (orderBadge) {
        orderBadge.textContent = ongoingOrderCount;
        orderBadge.hidden = ongoingOrderCount === 0;
    }

    // Show the current filter tab's orders
    renderFilteredOrders(currentFilter);
}

/* ================= FILTER TABS ================= */

const ongoingBtn = document.getElementById('OngoingToggleLabel');
const completedBtn = document.getElementById('CompletedToggleLabel');
const cancelledBtn = document.getElementById('CancelledToggleLabel');
let currentFilter = 'ongoing';

function setActiveTab(type) {
    currentFilter = type;
    [ongoingBtn, completedBtn, cancelledBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (type === 'ongoing' && ongoingBtn) ongoingBtn.classList.add('active');
    if (type === 'completed' && completedBtn) completedBtn.classList.add('active');
    if (type === 'cancelled' && cancelledBtn) cancelledBtn.classList.add('active');
    renderFilteredOrders(type);
}

function renderFilteredOrders(type) {
    const wrap = document.getElementById('orderRows');
    let filtered = [];

    if (type === 'ongoing') {
        filtered = orders.filter(o => o.order_status === 'Pending' || o.order_status === 'In Progress');
    } else if (type === 'completed') {
        filtered = orders.filter(o => o.order_status === 'Completed');
    } else if (type === 'cancelled') {
        filtered = orders.filter(o => o.order_status === 'Cancelled');
    }

    if (filtered.length === 0) {
        wrap.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:24px;">No ${type} orders.</div>`;
        return;
    }

    wrap.innerHTML = filtered.map((order, idx) => {
        const imgHtml = order.image
            ? `<img src="../Products/${order.image}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">`
            : `<div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;"></div>`;

        const statusClass = order.order_status === 'Completed' ? 'status-completed'
            : order.order_status === 'Cancelled' ? 'status-cancelled'
            : 'status-pending';

        return `
            <div class="order-row" data-order-id="${escapeHtml(order.order_id)}">
            <div class="row-thumb">${imgHtml}</div>
            <div>
                <div class="row-name">${escapeHtml(order.name)}</div>
                <div class="row-category">${escapeHtml(order.category)}</div>
            </div>
            <div class="row-price">${money(order.price)}</div>
            <div class="row-qty">${order.qty}</div>
            <div class="row-total">${money(itemTotal(order))}</div>
            <div class="row-status ${statusClass}">${escapeHtml(order.status)}</div>
            <div class="row-chevron">›</div>
        </div>`;
    }).join('');

    // Click to view order process
    wrap.querySelectorAll('.order-row').forEach(row => {
        row.addEventListener('click', () => {
            const orderId = row.dataset.orderId;
            if (orderId) {
                window.location.href = `../OrderProcess/MyOrderProcess/MyOrderProcess.html?order=${orderId}`;
            }
        });
    });
}

if (ongoingBtn) ongoingBtn.addEventListener('click', () => setActiveTab('ongoing'));
if (completedBtn) completedBtn.addEventListener('click', () => setActiveTab('completed'));
if (cancelledBtn) cancelledBtn.addEventListener('click', () => setActiveTab('cancelled'));

/* ================= INITIALIZE ================= */
// renderOrderRows is called by MyOrdersData.js after data loads
