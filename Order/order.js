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
        applyOrderFilters();   // keep any active search applied after re-render
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
                    <button type="button" class="order-arrow pending-detail-btn" aria-label="View details for order ${htmlEscape(o.order_id)}" title="View order details" onclick="openOrderDetailModal('${o.order_id}','${esc(o.product_name || '-')}','${esc(o.customer_name)}','${money(o.total_amount)}','PENDING','-','${o.date_requested_fmt || '-'}','${o.time_requested || ''}','-','','-','','${o.total_quantity || 0}','${esc(o.product_image || '')}')">&gt;</button>
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
                <span class="order-arrow" onclick="openOrderDetailModal('${o.order_id}','${esc(o.product_name||'')}','${esc(o.customer_name)}','${money(o.total_amount)}','${o.order_status.toUpperCase()}','${esc(o.accepted_by_name||'-')}','${o.date_requested_fmt||'-'}','${o.time_requested||''}','${o.date_accepted_fmt||'-'}','${o.time_accepted||''}','${o.date_finished_fmt||'-'}','${o.time_finished||''}','${o.total_quantity || 0}','${esc(o.product_image||'')}')">&gt;</span>
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
                               dateFinished, timeFinished, quantity, image) {
    document.getElementById('orderDetailId').textContent = orderId;
    document.getElementById('orderDetailProduct').textContent = product;
    document.getElementById('orderDetailQuantity').textContent = quantity;
    document.getElementById('orderDetailCustomer').textContent = customer;
    document.getElementById('orderDetailTotal').textContent = total;

    const detailImg = document.getElementById('orderDetailImage');
    const detailImgPlaceholder = document.getElementById('orderDetailImagePlaceholder');
    if (image) {
        detailImg.src = '../Products/' + image;
        detailImg.style.display = '';
        detailImgPlaceholder.style.display = 'none';
        detailImg.onerror = function() {
            detailImg.style.display = 'none';
            detailImgPlaceholder.style.display = 'flex';
        };
    } else {
        detailImg.removeAttribute('src');
        detailImg.style.display = 'none';
        detailImgPlaceholder.style.display = 'flex';
    }
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
    // Default quotation amount to total_amount (which already includes rush fee) if set, else fallback to productTotal
    document.getElementById('quotationAmountInput').value = reviewOrderData && reviewOrderData.quotation_amount !== null ? reviewOrderData.quotation_amount : productTotal;
    document.getElementById('quotationNotesInput').value = reviewOrderData ? (reviewOrderData.quotation_notes || '') : '';

    // Show the rush fee field inside the verification box if this is a rush order
    const rushFee = reviewOrderData ? parseFloat(reviewOrderData.rush_fee || 0) : 0;
    const rushRow = document.getElementById('verifRushRow');
    if (rushRow) {
        if (rushFee > 0) {
            document.getElementById('verifRushFee').textContent = 'P' + rushFee.toFixed(2);
            rushRow.style.display = '';
        } else {
            rushRow.style.display = 'none';
        }
    }

    updateDiscountDisplay(currentDiscount, productTotal);
}

function updateDiscountDisplay(discountPercent, productTotal) {
    if (!productTotal) {
        productTotal = reviewItems.reduce((sum, item) => sum + parseFloat(item.unit_price) * parseInt(item.quantity), 0);
    }
    const rushFee = reviewOrderData ? parseFloat(reviewOrderData.rush_fee || 0) : 0;
    const deducted = productTotal * (discountPercent / 100);
    // New total includes rush fee after discount is applied on product subtotal
    const newTotal = (productTotal - deducted) + rushFee;
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
    const rushFee = parseFloat(o.rush_fee || 0);
    const discount = parseFloat(o.discount_percent) || 0;
    const deducted = parseFloat(o.amount_deducted) || 0;
    // newTotal = (product subtotal - discount) + rush fee
    const newTotal = (productTotal - deducted) + rushFee;
    const paymentType = o.payment_type || '—';
    const amountToPay = paymentType.includes('50%') ? newTotal * 0.5 : newTotal;
    const remaining = newTotal - amountToPay;

    // Show/hide rush fee row
    const rushFeeField = document.getElementById('s3RushFeeField');
    if (rushFee > 0) {
        rushFeeField.style.display = '';
        document.getElementById('s3RushFee').textContent = 'P' + rushFee.toFixed(2);
    } else {
        rushFeeField.style.display = 'none';
    }

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
    const rushFee = parseFloat(o.rush_fee || 0);
    const discountedSubtotal = parseFloat(o.product_total) - parseFloat(o.amount_deducted || 0);
    // Total shown = discounted subtotal + rush fee (delivery fee set here, not yet added)
    const productTotal = discountedSubtotal + rushFee;
    document.getElementById('s4ProductTotal').textContent = 'P' + productTotal.toFixed(2);
    const rushFeeField = document.getElementById('s4RushFeeField');
    if (rushFee > 0) {
        document.getElementById('s4RushFee').textContent = 'P' + rushFee.toFixed(2);
        rushFeeField.style.display = '';
    } else {
        rushFeeField.style.display = 'none';
    }
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


// ── Order table search ──────────────────────────────────────
// Each search input carries data-body="<tbodyId>". Typing filters that
// table's rows by matching the row's visible text (Order ID / customer /
// product / status / date). Re-applied after loadOrders() re-renders.
function filterOrderTable(input) {
    const tbody = document.getElementById(input.dataset.body);
    if (!tbody) return;
    const q = input.value.trim().toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    let visible = 0;
    rows.forEach(row => {
        // Skip the "No ... / Loading" placeholder rows (single full-width cell).
        if (row.querySelector('td[colspan]')) return;
        const match = row.textContent.toLowerCase().includes(q);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
    });
    // Show a "no matches" note when a query hides everything.
    let note = tbody.querySelector('.order-search-empty');
    const hasRealRows = tbody.querySelector('tr:not(.order-search-empty) td:not([colspan])');
    if (q && visible === 0 && hasRealRows) {
        if (!note) {
            note = document.createElement('tr');
            note.className = 'order-search-empty';
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.cssText = 'text-align:center;color:#9ca3af;padding:16px;';
            td.textContent = 'No orders match your search.';
            note.appendChild(td);
            tbody.appendChild(note);
        }
        note.style.display = '';
    } else if (note) {
        note.style.display = 'none';
    }
}

function applyOrderFilters() {
    document.querySelectorAll('input[data-body]').forEach(input => {
        if (input.value.trim()) filterOrderTable(input);
    });
}


// ── Create New Order Modal Flow ─────────────────────────────
let createOrderProducts = [];
let createOrderQuantities = {};

document.getElementById('openCreateOrderModalBtn')?.addEventListener('click', () => {
    document.getElementById('coCustomerName').value = '';
    document.getElementById('coCustomerPhone').value = '';
    document.getElementById('coCustomerAddress').value = '';
    createOrderQuantities = {};
    showCreateOrderStep(1);
    document.getElementById('createOrderOverlay').classList.add('show');
    loadAvailableProductsForCreateOrder();
});

document.getElementById('createOrderBackBtn')?.addEventListener('click', () => {
    const s2 = document.getElementById('createOrderStep2');
    const s3 = document.getElementById('createOrderStep3');
    if (s3.style.display === 'block') {
        showCreateOrderStep(2);
    } else if (s2.style.display === 'block') {
        showCreateOrderStep(1);
    } else {
        closeCreateOrderModal();
    }
});

function closeCreateOrderModal() {
    document.getElementById('createOrderOverlay').classList.remove('show');
}

function showCreateOrderStep(step) {
    const s1 = document.getElementById('createOrderStep1');
    const s2 = document.getElementById('createOrderStep2');
    const s3 = document.getElementById('createOrderStep3');
    const title = document.getElementById('createOrderModalTitle');
    s1.style.display = step === 1 ? 'block' : 'none';
    s2.style.display = step === 2 ? 'block' : 'none';
    s3.style.display = step === 3 ? 'block' : 'none';

    if (step === 1) title.textContent = 'Create New Order - Customer Details';
    else if (step === 2) title.textContent = 'Create New Order - Select Products';
    else if (step === 3) title.textContent = 'Create New Order - Review Summary';
}

async function loadAvailableProductsForCreateOrder() {
    try {
        const res = await fetch('../Products/product_api.php?view=admin');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        createOrderProducts = data.products || [];
        renderCreateOrderProductList();
    } catch (err) {
        console.error('Error loading products for new order:', err);
        alert('Could not load products.');
    }
}

function renderCreateOrderProductList() {
    const container = document.getElementById('createOrderProductList');
    const q = (document.getElementById('createOrderSearch')?.value || '').trim().toLowerCase();
    const filtered = createOrderProducts.filter(p =>
        (p.name || '').toLowerCase().includes(q) || (p.type_of_product || '').toLowerCase().includes(q)
    );

    if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;">No available products found.</div>';
        return;
    }

    container.innerHTML = filtered.map(p => {
        const pid = p.id;
        const qty = createOrderQuantities[pid] || 0;
        const img = p.image_path ? htmlEscape(p.image_path) : '../imgs/image 2.png';
        const price = parseFloat(p.price || 0);

        return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;background:#fff;border:1px solid #f3c6dc;border-radius:8px;">
                <img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #ec4899;" alt="">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1b1f4b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${htmlEscape(p.name)}</div>
                    <div style="font-size:12px;color:#ec4899;font-weight:600;">P${price.toFixed(2)}</div>
                </div>
                <div style="display:flex;align-items:center;border:2px solid #ec4899;border-radius:6px;overflow:hidden;">
                    <button type="button" onclick="updateCoQty(${pid}, -1)" style="background:#fff;border:none;color:#ec4899;width:30px;height:30px;font-weight:bold;cursor:pointer;">-</button>
                    <span id="coQty_${pid}" style="width:36px;text-align:center;font-weight:700;color:#1b1f4b;font-size:14px;">${qty}</span>
                    <button type="button" onclick="updateCoQty(${pid}, 1)" style="background:#fff;border:none;color:#ec4899;width:30px;height:30px;font-weight:bold;cursor:pointer;">+</button>
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('createOrderSearch')?.addEventListener('input', () => {
    renderCreateOrderProductList();
});

function updateCoQty(productId, delta) {
    let current = createOrderQuantities[productId] || 0;
    current += delta;
    if (current < 0) current = 0;
    if (current === 0) {
        delete createOrderQuantities[productId];
    } else {
        createOrderQuantities[productId] = current;
    }
    const span = document.getElementById(`coQty_${productId}`);
    if (span) span.textContent = current;
}

document.getElementById('createOrderNextBtn')?.addEventListener('click', () => {
    const name = document.getElementById('coCustomerName').value.trim();
    const phone = document.getElementById('coCustomerPhone').value.trim();
    const address = document.getElementById('coCustomerAddress').value.trim();

    if (!name || !phone || !address) {
        alert('Please fill in customer name, phone number, and address.');
        return;
    }
    showCreateOrderStep(2);
});

document.getElementById('createOrderReviewBtn')?.addEventListener('click', () => {
    const selectedEntries = Object.entries(createOrderQuantities).filter(([id, qty]) => qty > 0);
    if (!selectedEntries.length) {
        alert('Please select at least one product with quantity greater than 0.');
        return;
    }

    const name = document.getElementById('coCustomerName').value.trim();
    const phone = document.getElementById('coCustomerPhone').value.trim();
    const address = document.getElementById('coCustomerAddress').value.trim();

    document.getElementById('summaryCustomerName').textContent = name;
    document.getElementById('summaryCustomerPhone').textContent = phone;
    document.getElementById('summaryCustomerAddress').textContent = address;

    let total = 0;
    const itemsHtml = selectedEntries.map(([pid, qty]) => {
        const product = createOrderProducts.find(p => String(p.id) === String(pid));
        if (!product) return '';
        const subtotal = parseFloat(product.price || 0) * qty;
        total += subtotal;
        return `
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#1b1f4b;">
                <span>${htmlEscape(product.name)} × ${qty}</span>
                <span style="font-weight:700;">P${subtotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    document.getElementById('summaryItemsList').innerHTML = itemsHtml;
    document.getElementById('summaryTotalAmount').textContent = 'P' + total.toFixed(2);
    showCreateOrderStep(3);
});

document.getElementById('createOrderSubmitBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('coCustomerName').value.trim();
    const phone = document.getElementById('coCustomerPhone').value.trim();
    const address = document.getElementById('coCustomerAddress').value.trim();
    const selectedEntries = Object.entries(createOrderQuantities).filter(([id, qty]) => qty > 0);

    const items = selectedEntries.map(([pid, qty]) => ({ product_id: parseInt(pid, 10), quantity: qty }));

    try {
        const res = await fetch(ORDER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_admin_order',
                customer_name: name,
                phone_num: phone,
                address: address,
                items: items
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create order');

        alert('Order ' + data.order_id + ' created successfully! Reflected in Order Process (Step 2).');
        closeCreateOrderModal();
        loadOrders();
    } catch (err) {
        console.error('Error creating order:', err);
        alert('Error: ' + err.message);
    }
});


document.querySelectorAll('input[data-body]').forEach(input => {
    input.addEventListener('input', () => filterOrderTable(input));
});
