const ORDER_API = 'order_api.php';

// ── Load all order data ─────────────────────────────────────
async function loadOrders() {
    try {
        const res = await fetch(ORDER_API);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        // Stats
        document.getElementById('statTotalOrders').textContent = data.stats.total;
        document.getElementById('statCompletedOrders').textContent = data.stats.completed;
        document.getElementById('statCanceledOrders').textContent = data.stats.cancelled;
        document.getElementById('statDueToday').textContent = data.stats.due_today;
        document.getElementById('statPendingOrders').textContent = data.stats.pending;
        document.getElementById('statProcessingOrders').textContent = data.stats.processing;

        // Tables
        renderPendingTable(data.pending, 'pendingBody');
        renderPendingTable(data.pending_rush, 'pendingRushBody');
        renderHistoryTable(data.history);
        renderProcessTable(data.in_progress);
    } catch (err) {
        console.error('Error loading orders:', err);
        alert('Error loading order data: ' + err.message);
    }
}

function money(val) {
    return 'P' + parseFloat(val).toFixed(2);
}

function esc(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ── Render Pending Orders ───────────────────────────────────
function renderPendingTable(orders, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">No pending orders.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${o.order_id}</td>
            <td>${o.customer_name}</td>
            <td>${o.product_name || '—'}</td>
            <td>${money(o.total_amount)}</td>
            <td>
                <div class="order-actions">
                    <button class="btn-accept" onclick="acceptOrder('${o.order_id}')">Accept</button>
                    <button class="btn-reject" onclick="rejectOrder('${o.order_id}')">Reject</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Render History Table ────────────────────────────────────
function renderHistoryTable(orders) {
    const tbody = document.getElementById('historyBody');
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px;">No order history.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        const statusClass = o.order_status === 'Completed' ? 'order-status-delivered' : 'order-status-cancelled';
        return `
        <tr>
            <td>${o.order_id}</td>
            <td>${o.date_requested}</td>
            <td>${o.customer_name}</td>
            <td>${o.product_name || '—'}</td>
            <td>${money(o.total_amount)}</td>
            <td><span class="order-status-badge ${statusClass}">${o.order_status.toUpperCase()}</span></td>
            <td>
                <span class="order-arrow" onclick="openOrderDetailModal('${o.order_id}','${esc(o.product_name||'')}','${esc(o.customer_name)}','${money(o.total_amount)}','${o.order_status.toUpperCase()}','${esc(o.accepted_by_name||'—')}','${o.date_requested_fmt||'—'}','${o.time_requested||''}','${o.date_accepted_fmt||'—'}','${o.time_accepted||''}','${o.date_finished_fmt||'—'}','${o.time_finished||''}')">&gt;</span>
            </td>
        </tr>`;
    }).join('');
}

// ── Render Order Process (In Progress) ──────────────────────
function renderProcessTable(orders) {
    const tbody = document.getElementById('processBody');
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">No orders in progress.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${o.order_id}</td>
            <td>${o.customer_name}</td>
            <td>${o.product_name || '—'}</td>
            <td>${money(o.total_amount)}</td>
            <td><span class="order-status-badge-process order-status-brown">IN PROGRESS</span></td>
            <td><span class="order-arrow" onclick="openOrderReviewModal()">&gt;</span></td>
        </tr>
    `).join('');
}

// ── Accept / Reject actions ─────────────────────────────────
async function acceptOrder(orderId) {
    if (!confirm('Accept order ' + orderId + '?')) return;
    const res = await fetch(ORDER_API, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'accept', order_id: orderId })
    });
    const data = await res.json();
    if (data.success) { loadOrders(); } else { alert(data.error); }
}

async function rejectOrder(orderId) {
    if (!confirm('Reject order ' + orderId + '? This will cancel the order.')) return;
    const res = await fetch(ORDER_API, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'reject', order_id: orderId })
    });
    const data = await res.json();
    if (data.success) { loadOrders(); } else { alert(data.error); }
}

// ── Order Detail Modal ──────────────────────────────────────
function openOrderDetailModal(orderId, product, customer, total, status, acceptedBy,
                               dateRequested, timeRequested, dateAccepted, timeAccepted,
                               dateFinished, timeFinished) {
    document.getElementById('orderDetailId').textContent = orderId;
    document.getElementById('orderDetailProduct').textContent = product;
    document.getElementById('orderDetailCustomer').textContent = customer;
    document.getElementById('orderDetailTotal').textContent = total;
    document.getElementById('orderDetailAcceptedBy').textContent = acceptedBy;
    document.getElementById('orderDetailDateRequested').textContent = dateRequested;
    document.getElementById('orderDetailTimeRequested').textContent = timeRequested;
    document.getElementById('orderDetailDateAccepted').textContent = dateAccepted;
    document.getElementById('orderDetailTimeAccepted').textContent = timeAccepted;
    document.getElementById('orderDetailDateFinished').textContent = dateFinished;
    document.getElementById('orderDetailTimeFinished').textContent = timeFinished;

    const statusEl = document.getElementById('orderDetailStatus');
    statusEl.textContent = status;
    statusEl.className = 'order-status-badge ' +
        (status === 'COMPLETED' ? 'order-status-delivered' :
         status === 'CANCELLED' ? 'order-status-cancelled' : 'order-status-processing');

    document.getElementById('orderDetailOverlay').classList.add('show');
}

function closeOrderDetailModal() {
    document.getElementById('orderDetailOverlay').classList.remove('show');
}

// ── Order Review Status Modal ───────────────────────────────
let currentReviewStep = 2;

const reviewStepTitles = {
    2: 'VERIFICATION',
    3: 'INITIAL PAYMENT',
    4: 'PROCESSING ORDER',
    5: 'FINAL PAYMENT',
    6: 'OUT FOR DELIVERY'
};

function openOrderReviewModal() {
    currentReviewStep = 2;
    showReviewStep(currentReviewStep);
    document.getElementById('orderReviewOverlay').classList.add('show');
}

function closeOrderReviewModal() {
    document.getElementById('orderReviewOverlay').classList.remove('show');
}

function showReviewStep(step) {
    for (let i = 2; i <= 6; i++) {
        const el = document.getElementById('reviewStep' + i);
        if (el) el.classList.toggle('active', i === step);
    }
    document.getElementById('reviewStepLabel').innerHTML =
        '<span class="step-number">STEP ' + step + ':</span> <span class="step-title">' + reviewStepTitles[step] + '</span>';
}

function approveReviewStep() {
    if (currentReviewStep < 6) {
        currentReviewStep++;
        showReviewStep(currentReviewStep);
    } else {
        closeOrderReviewModal();
    }
}

function backReviewStep() {
    if (currentReviewStep > 2) {
        currentReviewStep--;
        showReviewStep(currentReviewStep);
    } else {
        closeOrderReviewModal();
    }
}

// ── Init ────────────────────────────────────────────────────
loadOrders();
