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
        return true;
    } catch (err) {
        console.error('Error loading orders:', err);
        alert('Error loading order data: ' + err.message);
        return false;
    }
}

function money(val) {
    return 'P' + parseFloat(val).toFixed(2);
}

function esc(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function htmlEscape(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ── Render Pending Orders ───────────────────────────────────
function renderPendingTable(orders, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">No pending orders.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${htmlEscape(o.order_id)}</td>
            <td>${htmlEscape(o.customer_name)}</td>
            <td>${htmlEscape(o.product_name || '-')}</td>
            <td>${money(o.total_amount)}</td>
            <td>
                <div class="order-actions">
                    <button class="btn-accept" onclick="acceptOrder('${o.order_id}')">Accept</button>
                    <button class="btn-reject" onclick="rejectOrder('${o.order_id}')">Reject</button>
                    <button type="button" class="order-arrow pending-detail-btn" aria-label="View details for order ${htmlEscape(o.order_id)}" title="View order details" onclick="openOrderDetailModal('${o.order_id}','${esc(o.product_name || '-')}','${esc(o.customer_name)}','${money(o.total_amount)}','PENDING','-','${o.date_requested_fmt || '-'}','${o.time_requested || ''}','-','','-','','${o.total_quantity || 0}')">&gt;</button>
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
                <span class="order-arrow" onclick="openOrderDetailModal('${o.order_id}','${esc(o.product_name||'')}','${esc(o.customer_name)}','${money(o.total_amount)}','${o.order_status.toUpperCase()}','${esc(o.accepted_by_name||'-')}','${o.date_requested_fmt||'-'}','${o.time_requested||''}','${o.date_accepted_fmt||'-'}','${o.time_accepted||''}','${o.date_finished_fmt||'-'}','${o.time_finished||''}','${o.total_quantity || 0}')">&gt;</span>
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
            <td><span class="order-status-badge-process order-status-brown">${o.current_step ? o.current_step.toUpperCase() : 'IN PROGRESS'}</span></td>
            <td><span class="order-arrow" onclick="openOrderReviewModal('${o.order_id}')">&gt;</span></td>
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
                               dateFinished, timeFinished, quantity) {
    document.getElementById('orderDetailId').textContent = orderId;
    document.getElementById('orderDetailProduct').textContent = product;
    document.getElementById('orderDetailQuantity').textContent = quantity;
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
let reviewOrderId = null;
let reviewSteps = [];
let reviewOrderData = null;
let reviewItems = [];
let reviewViewingStep = 0;
let adminMessages = [];

function openOrderReviewModal(orderId) {
    reviewOrderId = orderId || null;
    if (!reviewOrderId) return;

    // Fetch steps from API
    fetch(ORDER_API, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'get_steps', order_id: reviewOrderId })
    })
    .then(r => r.json())
    .then(data => {
        if (!data.success) { alert(data.error); return; }
        reviewSteps = data.steps;
        reviewOrderData = data.order;
        reviewItems = data.items || [];

        document.getElementById('reviewOrderId').textContent = reviewOrderId;
        document.getElementById('reviewCustomerName').textContent = data.order ? data.order.customer_name : '—';

        // Also fetch chat messages
        fetch('../OrderProcess/MyOrderProcess/orderprocess_api.php?order_id=' + encodeURIComponent(reviewOrderId))
            .then(r => r.json())
            .then(msgData => {
                adminMessages = msgData.success ? (msgData.messages || []) : [];
                renderReviewSteps();
                document.getElementById('orderReviewOverlay').classList.add('show');
            })
            .catch(() => {
                adminMessages = [];
                renderReviewSteps();
                document.getElementById('orderReviewOverlay').classList.add('show');
            });
    })
    .catch(err => alert('Error loading order steps.'));
}

function renderReviewSteps() {
    const dots = document.querySelectorAll('.review-step-dot');

    // Find the current active step (first one that's 'In Progress' or 'Pending')
    let currentStepNum = 8;
    for (let i = 0; i < reviewSteps.length; i++) {
        if (reviewSteps[i].status === 'In Progress') {
            currentStepNum = parseInt(reviewSteps[i].step_number);
            break;
        }
        if (reviewSteps[i].status === 'Pending' && (i === 0 || ['Completed', 'Skipped'].includes(reviewSteps[i-1].status))) {
            currentStepNum = parseInt(reviewSteps[i].step_number);
            break;
        }
    }

    if (reviewViewingStep === 0) reviewViewingStep = currentStepNum;

    // Render dots
    dots.forEach(dot => {
        const stepNum = parseInt(dot.dataset.step);
        const stepData = reviewSteps.find(s => parseInt(s.step_number) === stepNum);
        dot.className = 'review-step-dot';

        if (stepData) {
            if (stepData.status === 'Completed') dot.classList.add('completed');
            else if (stepData.status === 'In Progress') dot.classList.add('current');
            else dot.classList.add('pending');
        } else {
            dot.classList.add('pending');
        }

        dot.onclick = function() {
            reviewViewingStep = stepNum;
            renderStepDetail(stepNum);
        };
    });

    renderStepDetail(reviewViewingStep);
}

function renderStepDetail(stepNum) {
    reviewViewingStep = stepNum;
    const stepData = reviewSteps.find(s => parseInt(s.step_number) === stepNum);
    const stepNames = ['','Order Details','Verification','Initial Payment','Processing','Final Payment','Out for Delivery','Order Received','Order Completed'];

    document.getElementById('reviewStepTitle').textContent = `STEP ${stepNum}: ${stepNames[stepNum] || ''}`;

    const statusEl = document.getElementById('reviewStepStatus');
    const metaBy = document.getElementById('reviewStepCompletedBy');
    const metaAt = document.getElementById('reviewStepCompletedAt');
    const actionRow = document.getElementById('reviewActionRow');
    const verifBox = document.getElementById('reviewVerificationBox');

    // Hide all step detail boxes
    verifBox.style.display = 'none';
    document.getElementById('reviewStep3Box').style.display = 'none';
    document.getElementById('reviewStep4Box').style.display = 'none';
    document.getElementById('reviewStep5Box').style.display = 'none';
    document.getElementById('reviewStep6Box').style.display = 'none';
    document.getElementById('reviewStep7Box').style.display = 'none';
    document.getElementById('reviewStep8Box').style.display = 'none';

    if (stepData) {
        statusEl.textContent = stepData.status.toUpperCase();
        statusEl.className = 'review-step-status';
        if (stepData.status === 'Completed') statusEl.classList.add('status-completed');
        else if (stepData.status === 'In Progress') statusEl.classList.add('status-in-progress');
        else statusEl.classList.add('status-pending');

        metaBy.textContent = stepData.completed_by_name ? `Completed by: ${stepData.completed_by_name}` : '';
        metaAt.textContent = stepData.completed_at ? `At: ${new Date(stepData.completed_at).toLocaleString()}` : '';
        document.getElementById('reviewStepNotes').value = stepData.notes || '';

        // Show advance button only for the current active step
        if (stepData.status === 'In Progress' || stepData.status === 'Pending') {
            const prevCompleted = reviewSteps.filter(s => parseInt(s.step_number) < stepNum).every(s => ['Completed', 'Skipped'].includes(s.status));
            if (prevCompleted && stepData.status !== 'Completed') {
                actionRow.style.display = 'flex';
            } else {
                actionRow.style.display = 'none';
            }
        } else {
            actionRow.style.display = 'none';
        }

        // Show verification details for Step 2
        if (stepNum === 2) {
            renderVerificationDetails();
            verifBox.style.display = 'block';
        }
        // Show payment details for Step 3
        if (stepNum === 3) {
            renderStep3Details();
            document.getElementById('reviewStep3Box').style.display = 'block';
        }
        // Show processing details for Step 4
        if (stepNum === 4) {
            renderStep4Details();
            document.getElementById('reviewStep4Box').style.display = 'block';
        }
        // Show final payment for Step 5
        if (stepNum === 5) {
            renderStep5Details();
            document.getElementById('reviewStep5Box').style.display = 'block';
        }
        // Show delivery for Step 6
        if (stepNum === 6) {
            renderStep6Details();
            document.getElementById('reviewStep6Box').style.display = 'block';
        }
        // Show received for Step 7
        if (stepNum === 7) {
            renderStep7Details();
            document.getElementById('reviewStep7Box').style.display = 'block';
        }
        // Show completed for Step 8
        if (stepNum === 8) {
            renderStep8Details();
            document.getElementById('reviewStep8Box').style.display = 'block';
        }
    } else {
        statusEl.textContent = 'PENDING';
        statusEl.className = 'review-step-status status-pending';
        metaBy.textContent = '';
        metaAt.textContent = '';
        actionRow.style.display = 'none';
    }

    // Highlight active dot
    document.querySelectorAll('.review-step-dot').forEach(d => {
        d.style.transform = parseInt(d.dataset.step) === stepNum ? 'scale(1.2)' : '';
    });

    // Show chat box for steps 2, 3, 5, 6
    const chatBox = document.getElementById('adminChatBox');
    if ([2, 3, 5, 6].includes(stepNum)) {
        chatBox.style.display = 'block';
        renderAdminChat(stepNum);
    } else {
        chatBox.style.display = 'none';
    }
}

document.getElementById('reviewAdvanceBtn').addEventListener('click', async function() {
    if (!reviewOrderId || !reviewViewingStep) return;
    if (reviewViewingStep === 2 && !(await saveVerificationAndQuotation())) return;
    let deliveryFee = null;
    if (reviewViewingStep === 4) {
        deliveryFee = parseFloat(document.getElementById('s4DeliveryFeeInput').value);
        if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
            alert('Enter a valid delivery fee.');
            return;
        }
    }
    if (!(await saveCurrentStepEvidence())) return;
    if (!confirm(`Approve Step ${reviewViewingStep} and advance to the next step?`)) return;

    const res = await fetch(ORDER_API, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'advance_step', order_id: reviewOrderId, step_number: reviewViewingStep, delivery_fee: deliveryFee })
    });
    const data = await res.json();
    if (data.success) {
        // Reload steps
        reviewViewingStep = reviewViewingStep === 4 && reviewOrderData?.payment_type === 'Full Payment'
            ? 6
            : Math.min(reviewViewingStep + 1, 8);
        openOrderReviewModal(reviewOrderId);
        loadOrders(); // Refresh the main tables
    } else {
        alert(data.error);
    }
});

async function saveCurrentStepEvidence() {
    const form = new FormData();
    form.append('action','save_evidence'); form.append('order_id',reviewOrderId);
    form.append('step_number',reviewViewingStep);
    form.append('notes',document.getElementById('reviewStepNotes').value.trim());
    const file = document.getElementById('reviewStepEvidence');
    if (file.files[0]) form.append('evidence',file.files[0]);
    const response = await fetch(ORDER_API,{method:'POST',body:form});
    const data = await response.json();
    if (!data.success) { alert(data.error); return false; }
    return true;
}

function closeOrderReviewModal() {
    document.getElementById('orderReviewOverlay').classList.remove('show');
    reviewViewingStep = 0;
}

// ── Verification Details (Step 2) ───────────────────────────
function renderVerificationDetails() {
    const container = document.getElementById('verifItems');
    if (!reviewItems.length) {
        container.innerHTML = '<p style="color:#9ca3af;">No items in this order.</p>';
        return;
    }

    let productTotal = 0;
    container.innerHTML = reviewItems.map(item => {
        const total = parseFloat(item.unit_price) * parseInt(item.quantity);
        productTotal += total;
        const imgHtml = item.image_path
            ? `<img src="../Products/${item.image_path}" class="verif-item-img">`
            : `<div class="verif-item-img-placeholder"></div>`;

        return `
        <div class="verif-item">
            <div>${imgHtml}</div>
            <div>
                <span class="verif-label">NAME</span>
                <div class="verif-item-name">${htmlEscape(item.name)}</div>
                <div class="verif-item-category">${htmlEscape(item.type_of_product || '')}</div>
            </div>
            <div>
                <span class="verif-label">QUANTITY</span>
                <div class="verif-item-qty">${item.quantity}</div>
            </div>
            <div>
                <span class="verif-label">PRICE</span>
                <div class="verif-value">P${parseFloat(item.unit_price).toFixed(2)}</div>
                <span class="verif-label" style="margin-top:8px;">TOTAL PRICE</span>
                <div class="verif-value">P${total.toFixed(2)}</div>
            </div>
        </div>`;
    }).join('');

    // Set discount values
    const discountInput = document.getElementById('verifDiscountInput');
    const currentDiscount = reviewOrderData ? parseFloat(reviewOrderData.discount_percent) : 0;
    discountInput.value = currentDiscount;
    document.getElementById('quotationAmountInput').value = reviewOrderData && reviewOrderData.quotation_amount !== null ? reviewOrderData.quotation_amount : productTotal;
    document.getElementById('quotationNotesInput').value = reviewOrderData ? (reviewOrderData.quotation_notes || '') : '';
    updateDiscountDisplay(currentDiscount, productTotal);
}

function updateDiscountDisplay(discountPercent, productTotal) {
    if (!productTotal) {
        productTotal = reviewItems.reduce((sum, item) => sum + parseFloat(item.unit_price) * parseInt(item.quantity), 0);
    }
    const deducted = productTotal * (discountPercent / 100);
    const newTotal = productTotal - deducted;
    document.getElementById('verifAmountDeducted').textContent = 'P' + deducted.toFixed(2);
    document.getElementById('verifNewTotal').textContent = 'P' + newTotal.toFixed(2);
}

// Discount input change handler
document.getElementById('verifDiscountInput').addEventListener('input', function() {
    const val = parseFloat(this.value) || 0;
    updateDiscountDisplay(val);
});

// Save verification values before Step 2 advances.
async function saveVerificationAndQuotation() {
    try {
        const discount = parseFloat(document.getElementById('verifDiscountInput').value) || 0;
        const discountRes = await fetch(ORDER_API, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ action: 'apply_discount', order_id: reviewOrderId, discount_percent: discount })
        });
        const discountData = await discountRes.json();
        if (!discountData.success) { alert(discountData.error); return false; }
        const quotationAmount = parseFloat(document.getElementById('quotationAmountInput').value);
        if (!Number.isFinite(quotationAmount) || quotationAmount < 0) { alert('Enter a valid quotation amount.'); return false; }
        const quotationNotes = document.getElementById('quotationNotesInput').value.trim();
        const quotationRes = await fetch(ORDER_API, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:'save_quotation',order_id:reviewOrderId,quotation_amount:quotationAmount,quotation_notes:quotationNotes})
        });
        const quotationData = await quotationRes.json();
        if (!quotationData.success) { alert(quotationData.error); return false; }
        return true;
    } catch (error) {
        alert('Unable to save verification details.');
        return false;
    }
}

// ── Step 3: Initial Payment ─────────────────────────────────
function renderStep3Details() {
    if (!reviewOrderData) return;
    const o = reviewOrderData;
    const productTotal = parseFloat(o.product_total) || 0;
    const discount = parseFloat(o.discount_percent) || 0;
    const deducted = parseFloat(o.amount_deducted) || 0;
    const newTotal = productTotal - deducted;
    const paymentType = o.payment_type || '—';
    const amountToPay = paymentType.includes('50%') ? newTotal * 0.5 : newTotal;
    const remaining = newTotal - amountToPay;

    document.getElementById('s3PaymentMethod').textContent = o.payment_method || '—';
    document.getElementById('s3ProductTotal').textContent = 'P' + productTotal.toFixed(2);
    document.getElementById('s3RemainingBalance').textContent = 'P' + remaining.toFixed(2);
    document.getElementById('s3NewProductTotal').textContent = 'P' + newTotal.toFixed(2);
    document.getElementById('s3RefNumber').textContent = o.reference_number || '—';
    document.getElementById('s3PaymentType').textContent = paymentType;
    document.getElementById('s3Discount').textContent = discount + '%';
    document.getElementById('s3AmountDeducted').textContent = 'P' + deducted.toFixed(2);
    document.getElementById('s3AmountToPay').textContent = 'P' + amountToPay.toFixed(2);
    document.getElementById('s3Screenshot').innerHTML = o.payment_screenshot ? `<a target="_blank" rel="noopener" href="../OrderProcess/evidence.php?kind=payment&order_id=${encodeURIComponent(reviewOrderId)}">View Photo</a>` : '-';
}

// ── Step 4: Processing ──────────────────────────────────────
function renderStep4Details() {
    if (!reviewOrderData) return;
    const o = reviewOrderData;
    const productTotal = parseFloat(o.product_total) - parseFloat(o.amount_deducted || 0);
    document.getElementById('s4ProductTotal').textContent = 'P' + productTotal.toFixed(2);
    document.getElementById('s4DeliveryFeeInput').value = parseFloat(o.delivery_fee || 0).toFixed(2);
}

// ── Step 5: Final Payment ───────────────────────────────────
function renderStep5Details() {
    if (!reviewOrderData) return;
    const o = reviewOrderData;
    const productTotal = parseFloat(o.product_total) - parseFloat(o.amount_deducted || 0);
    const deliveryFee = parseFloat(o.delivery_fee || 0);
    const remaining = parseFloat(o.remaining_balance || 0);
    const amountToPay = remaining;

    document.getElementById('s5PaymentMethod').textContent = o.payment_method || '—';
    document.getElementById('s5ProductBalance').textContent = 'P' + remaining.toFixed(2);
    document.getElementById('s5DeliveryFee').textContent = 'P' + deliveryFee.toFixed(2);
    document.getElementById('s5AmountToPay').textContent = 'P' + amountToPay.toFixed(2);
    document.getElementById('s5PaymentType').textContent = o.payment_type || '—';
    document.getElementById('s5RefNumber').textContent = o.reference_number || '—';
    document.getElementById('s5Screenshot').innerHTML = o.payment_screenshot ? `<a target="_blank" rel="noopener" href="../OrderProcess/evidence.php?kind=payment&order_id=${encodeURIComponent(reviewOrderId)}">View Photo</a>` : '-';
}

// ── Step 6: Out for Delivery ────────────────────────────────
function renderStep6Details() {
    if (!reviewOrderData) return;
    const o = reviewOrderData;
    document.getElementById('s6DeliveryMethod').textContent = o.delivery_method || 'Pickup';
    document.getElementById('s6Address').textContent = o.delivery_address || 'Pickup at store';
    document.getElementById('s6TotalAmount').textContent = 'P' + parseFloat(o.total_amount || 0).toFixed(2);
}

// ── Step 7: Order Received ──────────────────────────────────
function renderStep7Details() {
    if (!reviewOrderData) return;
    document.getElementById('s7TotalPaid').textContent = 'P' + parseFloat(reviewOrderData.total_amount || 0).toFixed(2);
}

// ── Step 8: Order Completed ─────────────────────────────────
function renderStep8Details() {
    if (!reviewOrderData) return;
    document.getElementById('s8TotalAmount').textContent = 'P' + parseFloat(reviewOrderData.total_amount || 0).toFixed(2);
}

// ── Admin Chat ──────────────────────────────────────────────
function renderAdminChat(stepNum) {
    const container = document.getElementById('adminChatMessages');
    const stepMessages = adminMessages.filter(m => parseInt(m.step_number) === stepNum);

    if (stepMessages.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = stepMessages.map(function(msg) {
        const isSent = msg.sender_role !== 'customer';
        const bubbleClass = isSent ? 'sent' : 'received';
        const senderLabel = isSent ? 'You' : (msg.sender_name || 'Customer');
        const time = msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '';

        return `
        <div class="admin-chat-bubble ${bubbleClass}">
            <div class="achat-sender">${htmlEscape(senderLabel)}</div>
            <div>${htmlEscape(msg.message)}</div>
            <div class="achat-time">${time}</div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

// Admin send message
document.getElementById('adminChatSendBtn').addEventListener('click', sendAdminMessage);
document.getElementById('adminChatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); sendAdminMessage(); }
});

async function sendAdminMessage() {
    const input = document.getElementById('adminChatInput');
    const message = input.value.trim();
    if (!message || !reviewOrderId || !reviewViewingStep) return;

    try {
        const res = await fetch('../OrderProcess/MyOrderProcess/orderprocess_api.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                action: 'send_message',
                order_id: reviewOrderId,
                step_number: reviewViewingStep,
                message: message
            })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            // Reload messages
            fetch('../OrderProcess/MyOrderProcess/orderprocess_api.php?order_id=' + encodeURIComponent(reviewOrderId))
                .then(r => r.json())
                .then(msgData => {
                    adminMessages = msgData.success ? (msgData.messages || []) : [];
                    renderAdminChat(reviewViewingStep);
                });
        } else {
            alert(data.error || 'Failed to send message.');
        }
    } catch (err) {
        alert('Error sending message.');
    }
}

// ── Init ────────────────────────────────────────────────────
(async function initializeOrdersPage() {
    const loaded = await loadOrders();
    if (!loaded) return;
    const linkParams = new URLSearchParams(window.location.search);
    const linkedOrderId = linkParams.get('order');
    const linkedStep = Number.parseInt(linkParams.get('step'), 10);
    if (Number.isInteger(linkedStep) && linkedStep >= 1 && linkedStep <= 8) reviewViewingStep = linkedStep;
    if (linkedOrderId) openOrderReviewModal(linkedOrderId);
})();
