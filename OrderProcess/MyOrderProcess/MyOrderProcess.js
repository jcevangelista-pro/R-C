const ORDER_PROCESS_API = 'orderprocess_api.php';
let currentOrderId = null;
let currentUserId = null;
let orderMessages = [];
let orderSteps = [];
let orderData = null;
let orderItems = [];
let orderPayments = [];
let requestedStepNumber = null;
let cancellableStep = null;
let hasInitializedTab = false;
function htmlEscape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.nav-tabs[role="tablist"] > li');
    const panes = document.querySelectorAll('.tab-content > .tab-pane');

    // Existing markup contains repeated legacy IDs; scope upload behavior to each field/card.
    document.querySelectorAll('.photo-upload').forEach(label => {
        label.addEventListener('click', event => {
            event.preventDefault();
            const field = label.closest('.field') || label.parentElement;
            const input = field ? field.querySelector('input[type="file"]') : null;
            if (input) input.click();
        });
    });
    document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
        input.addEventListener('change', () => {
            const field = input.closest('.field') || input.parentElement;
            const preview = field ? field.querySelector('.photo-upload img') : null;
            if (!preview || !input.files[0]) return;
            preview.src = URL.createObjectURL(input.files[0]);
            preview.style.display = 'block';
            const icon = field.querySelector('.photo-upload span');
            if (icon) icon.style.display = 'none';
        });
    });

    // Get order ID from URL
    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('order');
    const requestedStep = Number.parseInt(params.get('step'), 10);
    requestedStepNumber = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 8 ? requestedStep : null;

    if (!currentOrderId) {
        window.location.replace('../../MyOrders/Myorder.html');
        return;
    }

    // On load: show only step1, set only first tab active
    function init() {
        panes.forEach(function (pane, i) {
            if (i === 0) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        tabs.forEach(function (tab, i) {
            if (i === 0) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Switch to a step when its tab is clicked (only if unlocked)
    tabs.forEach(function (tab, index) {
        // Block Bootstrap's own data-toggle="tab" handler for locked steps.
        // Bootstrap binds to the inner <a>, so we intercept in the capture
        // phase and stop the event before its delegated handler can run.
        // Without this, clicking a locked step's circle would still switch to
        // the (shadowed) next step even though it has not been approved.
        const anchor = tab.querySelector('a[data-toggle="tab"]');
        if (anchor) {
            anchor.addEventListener('click', function (e) {
                if (tab.classList.contains('locked')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }, true);
        }

        tab.addEventListener('click', function (e) {
            e.preventDefault();

            // Check if this step is locked
            if (tab.classList.contains('locked')) return;

            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            panes.forEach(function (pane, i) {
                if (i === index) { pane.classList.add('active'); }
                else { pane.classList.remove('active'); }
            });
        });
    });

    // Lock/unlock steps based on order process data
    window.applyStepLocks = function() {
        const tabs = document.querySelectorAll('.nav-tabs[role="tablist"] > li');
        const panes = document.querySelectorAll('.tab-content > .tab-pane');
        if (!tabs || !panes || !tabs.length) return;

        // A freshly checked-out order is still "Pending" and has no process
        // rows yet (those are created when the admin accepts it). In that case
        // only Step 1 (Order Details) is viewable and every later step must be
        // locked — otherwise all steps would appear accessible.
        const hasSteps = orderSteps && orderSteps.length > 0;

        // Determine how far the customer may navigate. A step counts as
        // "approved" only once admin/owner marks it Completed (or Skipped).
        // Approving the current step is what sets the NEXT step to In Progress,
        // so the current In Progress step is the furthest accessible step.
        // Everything beyond it stays locked until the admin approves.
        let highestApproved = 0;   // highest Completed/Skipped step number
        let currentActiveStep = 0; // the single In Progress step, if any

        if (hasSteps) {
            orderSteps.forEach(function(step) {
                const stepNum = parseInt(step.step_number);
                if (step.status === 'Completed' || step.status === 'Skipped') {
                    highestApproved = Math.max(highestApproved, stepNum);
                }
                if (step.status === 'In Progress') {
                    currentActiveStep = stepNum;
                }
            });
        }

        // Accessible range:
        //  - all approved steps (Completed/Skipped), and
        //  - the current In Progress step (reached only because the previous
        //    step was approved).
        // With no process rows yet (just checked out) only Step 1 is open.
        let maxAccessible = currentActiveStep > 0 ? currentActiveStep : highestApproved;
        if (!hasSteps) maxAccessible = 1;

        // Fall back to step 1 for display when nothing is active yet.
        const displayStep = currentActiveStep > 0
            ? currentActiveStep
            : (highestApproved > 0 ? highestApproved : 1);

        tabs.forEach(function(tab, index) {
            const stepNum = index + 1;
            if (stepNum > maxAccessible) {
                tab.classList.add('locked');
            } else {
                tab.classList.remove('locked');
            }
        });

        // Also darken locked panes
        panes.forEach(function(pane, index) {
            const stepNum = index + 1;
            if (stepNum > maxAccessible) {
                pane.classList.add('step-locked');
            } else {
                pane.classList.remove('step-locked');
            }
        });

        // Show the current active step on load or preserve current active tab on reload
        let targetStep = displayStep;
        if (requestedStepNumber && requestedStepNumber <= maxAccessible) {
            targetStep = requestedStepNumber;
            requestedStepNumber = null;
        } else if (hasInitializedTab) {
            const activeTabEl = document.querySelector('.nav-tabs[role="tablist"] > li.active');
            if (activeTabEl) {
                const activeIdx = Array.from(tabs).indexOf(activeTabEl);
                if (activeIdx >= 0 && (activeIdx + 1) <= maxAccessible) {
                    targetStep = activeIdx + 1;
                }
            }
        }
        hasInitializedTab = true;

        const activeIndex = targetStep - 1;
        tabs.forEach(function(t) { t.classList.remove('active'); });
        panes.forEach(function(p) { p.classList.remove('active'); });
        if (tabs[activeIndex]) tabs[activeIndex].classList.add('active');
        if (panes[activeIndex]) panes[activeIndex].classList.add('active');
    };

    // Allow Enter key to send message
    [2, 3, 5, 6].forEach(function(step) {
        const input = document.getElementById('chatInput' + step);
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage(step);
                }
            });
        }
    });

    initializeCancellationModal();
    init();

    // Load order data from DB
    if (currentOrderId) {
        loadOrderProcess();
    }

    // Get current user ID
    fetch('../../Registration/check_session.php')
        .then(r => r.json())
        .then(data => {
            if (data.logged_in) {
                currentUserId = data.username;
            }
        })
        .catch(() => {});
});

// ── Load order process data ─────────────────────────────────
async function loadOrderProcess() {
    try {
        const res = await fetch(ORDER_PROCESS_API + '?order_id=' + encodeURIComponent(currentOrderId));
        const data = await res.json();
        if (!data.success) {
            if (data.error === 'unauthorized') {
                window.location.href = '../../Registration/LogInPage.html';
                return;
            }
            return;
        }

        orderMessages = data.messages || [];
        orderSteps = data.steps || [];
        orderData = data.order || null;
        orderItems = data.items || [];
        orderPayments = data.payments || [];
        cancellableStep = data.can_cancel ? Number(data.cancel_step) : null;
        updateCancellationButtons();

        // Show the Step 4 delivery-fee evidence in the Final Payment card.
        const deliveryFeeEvidence = orderSteps.find(step => Number(step.step_number) === 4 && step.image);
        const deliveryFeeLabel = Array.from(document.querySelectorAll('#FinalPaymentCard .field > .stat-label'))
            .find(label => label.textContent.trim() === 'DELIVERY FEE IMAGE:');
        const deliveryFeeBox = deliveryFeeLabel ? deliveryFeeLabel.parentElement.querySelector('.photo-upload') : null;
        if (deliveryFeeBox) {
            const evidenceImage = deliveryFeeBox.querySelector('img');
            const evidencePlaceholder = deliveryFeeBox.querySelector('span');
            deliveryFeeBox.classList.add('delivery-fee-image-link');
            deliveryFeeBox.removeAttribute('for');
            if (deliveryFeeEvidence && evidenceImage) {
                const evidenceUrl = '../../OrderProcess/evidence.php?kind=process&step=4&order_id=' + encodeURIComponent(currentOrderId);
                evidenceImage.src = evidenceUrl;
                evidenceImage.alt = 'Delivery fee evidence';
                evidenceImage.style.display = 'block';
                if (evidencePlaceholder) evidencePlaceholder.style.display = 'none';
                deliveryFeeBox.tabIndex = 0;
                deliveryFeeBox.setAttribute('role', 'link');
                deliveryFeeBox.setAttribute('aria-label', 'View delivery fee image');
                const openEvidence = () => window.open(evidenceUrl, '_blank', 'noopener');
                deliveryFeeBox.onclick = openEvidence;
                deliveryFeeBox.onkeydown = event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openEvidence();
                    }
                };
            } else {
                if (evidenceImage) {
                    evidenceImage.removeAttribute('src');
                    evidenceImage.style.display = 'none';
                }
                if (evidencePlaceholder) {
                    evidencePlaceholder.textContent = 'No image uploaded';
                    evidencePlaceholder.style.display = '';
                }
                deliveryFeeBox.removeAttribute('tabindex');
                deliveryFeeBox.removeAttribute('role');
                deliveryFeeBox.removeAttribute('aria-label');
                deliveryFeeBox.onclick = null;
                deliveryFeeBox.onkeydown = null;
            }
        }

        // Populate payment card fields with real order data
        if (data.order) {
            const order = data.order;
            const productTotal = parseFloat(order.product_total) || 0;
            const amountDeducted = parseFloat(order.amount_deducted) || 0;
            const rushFee = parseFloat(order.rush_fee) || 0;
            const newTotal = productTotal - amountDeducted + rushFee;
            const deliveryFee = parseFloat(order.delivery_fee) || 0;
            const remaining = parseFloat(order.remaining_balance) || 0;

            // Update ALL .stat-value elements inside PaymentCard with the correct values
            const paymentCard = document.getElementById('PaymentCard');
            if (paymentCard) {
                paymentCard.dataset.fullAmount = String(newTotal);
                const statValues = paymentCard.querySelectorAll('.od-inline-row .stat-value');
                if (statValues[0]) statValues[0].textContent = 'P' + newTotal.toFixed(2);
                if (statValues[1]) statValues[1].textContent = 'P' + newTotal.toFixed(2);
            }

            // Update FinalPaymentCard
            const finalPaymentCard = document.getElementById('FinalPaymentCard');
            if (finalPaymentCard) {
                const fpStatValues = finalPaymentCard.querySelectorAll('.od-inline-row .od-stat .stat-value');
                // First od-inline-row has: Delivery Fee
                // Second od-inline-row has: Product Balance, Amount to Pay (Product Balance + Delivery Fee)
                const allRows = finalPaymentCard.querySelectorAll('.od-inline-row');
                if (allRows[0]) {
                    const vals = allRows[0].querySelectorAll('.stat-value');
                    if (vals[0]) vals[0].textContent = 'P' + deliveryFee.toFixed(2);
                }
                if (allRows[1]) {
                    const vals = allRows[1].querySelectorAll('.stat-value');
                    if (vals[0]) vals[0].textContent = 'P' + remaining.toFixed(2);
                    // Amount to Pay = Product Balance + Delivery Fee
                    if (vals[1]) vals[1].textContent = 'P' + (remaining + deliveryFee).toFixed(2);
                }
            }
        }

        renderAllChats();

        // Apply step locks after data is loaded
        if (typeof applyStepLocks === 'function') {
            applyStepLocks();
        }

        // Fill each step's "Submitted" date with the real approval/submission
        // date for that specific step.
        populateStepDates();

        // Lock down interactive controls on steps that are already completed,
        // so (for example) a submitted & approved payment cannot be resubmitted.
        applyStepReadOnly();

        // Populate and lock submitted payment steps (Step 3 & Step 5)
        populatePayments();

        // Fill Step 7 (Order Received) with the real product and customer info.
        populateStep7();

        // Fill Step 8 (Order Completed) summary/receipt with real order data.
        populateStep8();

        // Update each step's status badge to reflect its real status.
        populateStepBadges();

    } catch (err) {
        console.error('Failed to load order process:', err);
    }
}

// ── Step dates ──────────────────────────────────────────────
// Format a DB datetime (e.g. "2026-08-10 07:42:00") like "August 10, 2026 | 7:42 AM".
function formatStepDate(value) {
    if (!value) return null;
    // Normalize "YYYY-MM-DD HH:MM:SS" to an ISO-ish string so Date parses it
    // consistently across browsers.
    const parsed = new Date(String(value).replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return null;
    const datePart = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const timePart = parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return datePart + ' | ' + timePart;
}

// Return the real date for a given step number:
//   - Completed/Skipped -> completed_at (the approved date)
//   - In Progress       -> created_at (when the step became active)
//   - otherwise         -> null (not reached yet)
function stepDateFor(stepNumber) {
    const step = (orderSteps || []).find(s => parseInt(s.step_number) === stepNumber);
    if (step) {
        if ((step.status === 'Completed' || step.status === 'Skipped') && step.completed_at) {
            return formatStepDate(step.completed_at);
        }
        if (step.status === 'In Progress') {
            return formatStepDate(step.created_at) || formatStepDate(step.process_date);
        }
        // Reached but no timestamp yet.
        return formatStepDate(step.completed_at) || formatStepDate(step.created_at);
    }
    // Step 1 represents the checkout submission even before process rows exist.
    if (stepNumber === 1 && orderData && orderData.date_requested) {
        return formatStepDate(orderData.date_requested);
    }
    return null;
}

// Fill every step's "Submitted" history line and the order timeline with the
// real per-step date, or a placeholder when the step has not been reached.
function populateStepDates() {
    const PENDING = 'Pending';
    for (let n = 1; n <= 8; n++) {
        const pane = document.getElementById('step' + n);
        if (!pane) continue;
        // Target only the LEFT status-card history line (Step 7/8 reuse
        // .status-history elsewhere, so scope to .status-card to avoid those).
        const item = pane.querySelector('.status-card .status-history .status-history-item');
        if (!item) continue;
        const dateEl = item.querySelector('p');
        const labelEl = item.querySelector('strong');
        const step = (orderSteps || []).find(s => parseInt(s.step_number) === n);
        const status = step ? step.status : (n === 1 && orderData ? 'Completed' : null);
        const dateText = stepDateFor(n);

        if (dateEl) dateEl.textContent = dateText || PENDING;
        if (labelEl) {
            if (status === 'Completed' || status === 'Skipped') labelEl.textContent = (n >= 3 && n <= 5) ? 'Approved' : 'Completed';
            else if (status === 'In Progress') labelEl.textContent = 'Submitted';
            else labelEl.textContent = 'Pending';
        }
    }

    // Order timeline summary (one .OPCTime per step, in order 1..8).
    const timelineTimes = document.querySelectorAll('.OrderTimelineContainer .OPCTime');
    timelineTimes.forEach(function(el, idx) {
        el.textContent = stepDateFor(idx + 1) || PENDING;
    });
}

// Disable interactive controls inside any step that is already Completed or
// Skipped. A finished step is read-only: no more payments, messages, uploads,
// or option toggles. Viewing the step's content remains possible.
function applyStepReadOnly() {
    for (let n = 1; n <= 8; n++) {
        const pane = document.getElementById('step' + n);
        if (!pane) continue;

        const step = (orderSteps || []).find(s => parseInt(s.step_number) === n);
        const isDone = step && (step.status === 'Completed' || step.status === 'Skipped');

        if (isDone) {
            pane.classList.add('step-readonly');
            // Disable every form control and action button inside the step.
            pane.querySelectorAll('button, input, select, textarea').forEach(function(el) {
                // Keep the cancel-order button logic alone; it is already
                // hidden/managed separately and only shows in steps 1-2.
                el.disabled = true;
            });
            // Neutralize the custom checkbox/option toggles (they are <div>s,
            // not form controls) by blocking pointer interaction.
            pane.querySelectorAll('.checkbox-option, .photo-upload').forEach(function(el) {
                el.style.pointerEvents = 'none';
            });
        } else {
            pane.classList.remove('step-readonly');
        }
    }
}

// Populate and lock submitted payment steps (Step 3 and Step 5)
function populatePayments() {
    // ── Step 3 Initial Payment ──────────────────────────────
    const initialPayment = (orderPayments || []).find(p =>
        (p.payment_type === 'Full Payment' || p.payment_type === '50% Down Payment') &&
        (p.status === 'Submitted' || p.status === 'Verified')
    );

    const paymentCard = document.getElementById('PaymentCard');
    if (paymentCard && initialPayment) {
        const refInput = paymentCard.querySelector('input[placeholder="XXXX-XXX-XXXXXX"]');
        if (refInput) {
            refInput.value = initialPayment.reference_number || '';
            refInput.disabled = true;
        }

        const fileInput = paymentCard.querySelector('input[type="file"]');
        if (fileInput) fileInput.disabled = true;

        const uploadBox = paymentCard.querySelector('.photo-upload');
        if (uploadBox) {
            uploadBox.style.pointerEvents = 'none';
            const img = uploadBox.querySelector('img');
            const icon = uploadBox.querySelector('span');
            if (img && initialPayment.proof_path) {
                img.src = '../../OrderProcess/evidence.php?kind=payment&payment_type=' + encodeURIComponent(initialPayment.payment_type) + '&order_id=' + encodeURIComponent(currentOrderId);
                img.style.display = 'block';
                if (icon) icon.style.display = 'none';
            }
        }

        paymentCard.querySelectorAll('.done-btn').forEach(btn => {
            btn.disabled = true;
            btn.textContent = initialPayment.status === 'Verified' ? 'VERIFIED' : 'SUBMITTED';
        });

        paymentCard.querySelectorAll('.checkbox-option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });
    }

    // ── Step 5 Final Payment ────────────────────────────────
    const finalPayment = (orderPayments || []).find(p =>
        p.payment_type === 'Final Payment' &&
        (p.status === 'Submitted' || p.status === 'Verified')
    );

    const finalPaymentCard = document.getElementById('FinalPaymentCard');
    if (finalPaymentCard && finalPayment) {
        const refInput = finalPaymentCard.querySelector('.ScreenShot-RefNum-Row input[placeholder="XXXX-XXX-XXXXXX"]');
        if (refInput) {
            refInput.value = finalPayment.reference_number || '';
            refInput.disabled = true;
        }

        const fileInput = finalPaymentCard.querySelector('.ScreenShot-RefNum-Row input[type="file"]');
        if (fileInput) fileInput.disabled = true;

        const uploadBox = finalPaymentCard.querySelector('.ScreenShot-RefNum-Row .photo-upload');
        if (uploadBox) {
            uploadBox.style.pointerEvents = 'none';
            const img = uploadBox.querySelector('img');
            const icon = uploadBox.querySelector('span');
            if (img && finalPayment.proof_path) {
                img.src = '../../OrderProcess/evidence.php?kind=payment&payment_type=Final+Payment&order_id=' + encodeURIComponent(currentOrderId);
                img.style.display = 'block';
                if (icon) icon.style.display = 'none';
            }
        }

        finalPaymentCard.querySelectorAll('.done-btn').forEach(btn => {
            btn.disabled = true;
            btn.textContent = finalPayment.status === 'Verified' ? 'VERIFIED' : 'SUBMITTED';
        });

        finalPaymentCard.querySelectorAll('.checkbox-option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });
    }
}

// Populate Step 7 (Order Received Confirmation) with the real customer and
// product information from the loaded order.
function populateStep7() {
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const peso = v => 'P' + (Number(v) || 0).toFixed(2);

    if (orderData) {
        const o = orderData;
        const method = o.delivery_method || 'Pickup';
        setText('s7DeliveryMethod', method === 'Pickup' ? 'Pickup at store' : 'Delivery');
        setText('s7CustomerName', o.customer_name || '—');
        setText('s7CustomerAddress',
            method === 'Pickup' ? 'Pickup at store' : (o.delivery_address || o.address || '—'));
        setText('s7CustomerPhone', o.phone_num || '—');

        // Delivery date/time (may be null until scheduled).
        const deliveryDate = formatStepDate(o.delivery_date);
        if (deliveryDate) {
            const parts = deliveryDate.split(' | ');
            setText('s7DeliveryDate', parts[0] || '—');
            setText('s7DeliveryTime', parts[1] || '');
        } else {
            setText('s7DeliveryDate', '—');
            setText('s7DeliveryTime', '');
        }

        setText('s7DeliveryFee', peso(o.delivery_fee));
        setText('s7Discount', peso(o.amount_deducted));
        setText('s7TotalPaid', peso(o.amount_paid));
    }

    // Product information. The layout shows one product block, so summarise:
    // name/category/image from the first item, quantity as the total across
    // items, and prices from the order totals.
    if (orderItems && orderItems.length) {
        const first = orderItems[0];
        const totalQty = orderItems.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);
        const productSubtotal = orderItems.reduce((sum, it) =>
            sum + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 0), 0);

        const extraNames = orderItems.length > 1 ? ` (+${orderItems.length - 1} more)` : '';
        setText('s7ItemName', (first.name || '—') + extraNames);
        setText('s7ItemCategory', first.type_of_product || '');
        setText('s7ItemQty', String(totalQty));
        setText('s7ItemPrice', peso(first.unit_price));

        // Total price = product subtotal minus the order-level discount amount.
        const discount = orderData ? (parseFloat(orderData.amount_deducted) || 0) : 0;
        setText('s7ItemTotal', peso(Math.max(0, productSubtotal - discount)));

        const img = document.getElementById('s7ItemImage');
        if (img && first.image_path) {
            img.src = '../../Products/' + first.image_path;
        }
    }

    // If the customer already submitted a receipt photo, show it in the upload
    // preview so the confirmation is visible on return visits.
    const step7 = (orderSteps || []).find(s => parseInt(s.step_number) === 7);
    if (step7 && step7.image) {
        const preview = document.getElementById('s7PhotoPreview');
        const icon = document.getElementById('s7PhotoIcon');
        if (preview) {
            preview.src = '../../OrderProcess/evidence.php?kind=process&step=7&order_id=' + encodeURIComponent(currentOrderId);
            preview.style.display = 'block';
        }
        if (icon) icon.style.display = 'none';
    }
}

// Populate Step 8 (Order Completed) summary and receipt with real order data.
function populateStep8() {
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const peso = v => '\u20B1' + (Number(v) || 0).toFixed(2); // ₱

    if (orderData) {
        const o = orderData;
        const method = o.delivery_method || 'Pickup';
        const isPickup = method === 'Pickup';

        // Status information
        setText('s8OrderStatus', o.order_status || '—');
        const payStatusMap = { Paid: 'Fully Paid', Partial: 'Partially Paid', Unpaid: 'Unpaid' };
        const payStatusLabel = payStatusMap[o.payment_status] || (o.payment_status || '—');
        setText('s8PaymentStatus', payStatusLabel);
        setText('s8PaymentStatusDetail', payStatusLabel);
        setText('s8DeliveryStatus', o.order_status === 'Completed'
            ? (isPickup ? 'Picked Up' : 'Delivered')
            : (isPickup ? 'For Pickup' : 'For Delivery'));

        // Receipt header
        setText('s8ReceiptNo', o.receipt_no || ('RC-' + (o.order_id || '').replace(/^ORD-/, '')));
        setText('s8OrderId', o.order_id || currentOrderId || '—');
        const receiptDate = formatStepDate(o.date_finished) || formatStepDate(o.date_requested);
        setText('s8ReceiptDate', receiptDate ? receiptDate.split(' | ')[0] : '—');

        // Customer information
        setText('s8CustomerName', o.customer_name || '—');
        setText('s8CustomerContact', o.phone_num || '—');

        // Product details (delivery method + customization live on the order)
        setText('s8Customization', o.customization_type || 'Standard');
        setText('s8DeliveryMethod', isPickup ? 'Pickup at store' : 'Delivery');

        // Payment details
        setText('s8PaymentType', o.payment_type || '—');
        setText('s8PaymentMethod', o.payment_method || '—');
        setText('s8AmountPaid', peso(o.amount_paid));
        setText('s8Remaining', peso(o.remaining_balance));
        setText('s8Reference', o.reference_number || '—');
    }

    // Product + quantity from the order items.
    if (orderItems && orderItems.length) {
        const first = orderItems[0];
        const totalQty = orderItems.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);
        const extra = orderItems.length > 1 ? ` (+${orderItems.length - 1} more)` : '';
        setText('s8Product', (first.name || '—') + extra);
        setText('s8Quantity', String(totalQty));
    }
}

// Update each step's status badge (below the step description) to reflect the
// step's real status:
//   Completed/Skipped -> "COMPLETED"
//   In Progress       -> "IN PROCESS" (the current step)
//   otherwise         -> the original "Available after ..." pending message.
function populateStepBadges() {
    for (let n = 1; n <= 8; n++) {
        const pane = document.getElementById('step' + n);
        if (!pane) continue;
        const badge = pane.querySelector('.status-message .status-badge');
        if (!badge) continue;

        // Remember the default pending text the first time we touch the badge
        // so it can be restored if the step is not yet reached.
        if (badge.dataset.defaultText === undefined) {
            badge.dataset.defaultText = badge.textContent.trim();
        }

        const step = (orderSteps || []).find(s => parseInt(s.step_number) === n);
        const status = step ? step.status : null;

        badge.classList.remove('badge-completed', 'badge-inprocess', 'badge-pending');

        if (status === 'Completed' || status === 'Skipped') {
            badge.textContent = '🟢 COMPLETED';
            badge.classList.add('badge-completed');
        } else if (status === 'In Progress') {
            badge.textContent = '🔵 IN PROCESS';
            badge.classList.add('badge-inprocess');
        } else {
            badge.textContent = badge.dataset.defaultText;
            badge.classList.add('badge-pending');
        }
    }
}

// ── Render chat messages ────────────────────────────────────
function renderAllChats() {
    [2, 3, 5, 6].forEach(function(step) {
        renderChatForStep(step);
    });
}

function renderChatForStep(stepNumber) {
    const container = document.getElementById('chatMessages' + stepNumber);
    if (!container) return;

    const stepMessages = orderMessages.filter(m => parseInt(m.step_number) === stepNumber);

    if (stepMessages.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = stepMessages.map(function(msg) {
        const isSent = msg.sender_role === 'customer';
        const bubbleClass = isSent ? 'sent' : 'received';
        const senderLabel = isSent ? 'You' : (msg.sender_name || 'Admin');
        const time = msg.created_at
            ? new Date(String(msg.created_at).replace(' ', 'T')).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
            : '';

        return `
        <div class="chat-bubble ${bubbleClass}">
            <div class="chat-sender">${htmlEscape(senderLabel)}</div>
            <div>${htmlEscape(msg.message)}</div>
            <div class="chat-time">${time}</div>
        </div>`;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// ── Send message ────────────────────────────────────────────
async function sendMessage(stepNumber) {
    const input = document.getElementById('chatInput' + stepNumber);
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;
    if (!currentOrderId) { alert('No order selected.'); return; }

    try {
        const res = await fetch(ORDER_PROCESS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_message',
                order_id: currentOrderId,
                step_number: stepNumber,
                message: message
            })
        });
        const data = await res.json();

        if (data.success) {
            input.value = '';
            // Reload messages
            loadOrderProcess();
        } else {
            alert(data.error || 'Failed to send message.');
        }
    } catch (err) {
        alert('Error sending message.');
    }
}

// ── Payment Submission (Step 3) ─────────────────────────────
// Wire up the SUBMIT buttons in PaymentCard and FinalPaymentCard

document.addEventListener('DOMContentLoaded', function() {

    // Step 3: Initial Payment SUBMIT
    const step3SubmitBtns = document.querySelectorAll('#PaymentCard .done-btn');
    step3SubmitBtns.forEach(function(btn) {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!currentOrderId) { alert('No order loaded.'); return; }

            // Detect selected payment method
            const gcashBox = document.querySelector('#PaymentCard .MoP-PT-Row .checkbox-option:nth-child(1) .box');
            const bankBox = document.querySelector('#PaymentCard .MoP-PT-Row .checkbox-option:nth-child(2) .box');
            let paymentMethod = '';
            if (gcashBox && gcashBox.classList.contains('active')) paymentMethod = 'GCash';
            if (bankBox && bankBox.classList.contains('active')) paymentMethod = 'Bank';

            // Detect payment type
            const fullBox = document.querySelectorAll('#PaymentCard .MoP-PT-Row')[0];
            const ptBoxes = document.querySelectorAll('#PaymentCard .MoP-PT-Row div:nth-child(2) .checkbox-option .box');
            let paymentType = '';
            if (ptBoxes[0] && ptBoxes[0].classList.contains('active')) paymentType = 'Full Payment';
            if (ptBoxes[1] && ptBoxes[1].classList.contains('active')) paymentType = '50% Down Payment';

            // Get reference number
            const refInput = document.querySelector('#PaymentCard input[placeholder="XXXX-XXX-XXXXXX"]');
            const referenceNumber = refInput ? refInput.value.trim() : '';

            if (!paymentMethod) { alert('Please select a payment method (GCash or Bank).'); return; }
            if (!paymentType) { alert('Please select a payment type.'); return; }
            if (!referenceNumber) { alert('Please enter the payment reference number.'); return; }
            const proof = document.querySelector('#PaymentCard input[type="file"]');
            if (!proof || !proof.files[0]) { alert('Please upload a screenshot of your payment.'); return; }

            try {
                const form = new FormData();
                form.append('action','submit_payment');
                form.append('order_id',currentOrderId);
                form.append('payment_method',paymentMethod);
                form.append('payment_type',paymentType);
                form.append('reference_number',referenceNumber);
                form.append('proof', proof.files[0]);
                const res = await fetch(ORDER_PROCESS_API, {method:'POST',body:form});
                const data = await res.json();
                if (data.success) {
                    alert('Payment submitted successfully!');
                } else {
                    alert(data.error || 'Failed to submit payment.');
                }
            } catch (err) {
                alert('Error submitting payment.');
            }
        });
    });

    // Step 5: Final Payment SUBMIT
    const step5SubmitBtns = document.querySelectorAll('#FinalPaymentCard .done-btn');
    step5SubmitBtns.forEach(function(btn) {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!currentOrderId) { alert('No order loaded.'); return; }

            const finalMethodBoxes = document.querySelectorAll('#FinalPaymentCard .MoP-PT-Row > div:first-child .checkbox-option .box');
            let paymentMethod = '';
            if (finalMethodBoxes[0] && finalMethodBoxes[0].classList.contains('active')) paymentMethod = 'GCash';
            if (finalMethodBoxes[1] && finalMethodBoxes[1].classList.contains('active')) paymentMethod = 'Bank';
            if (!paymentMethod) { alert('Please select a payment method (GCash or Bank).'); return; }

            // Get reference number from final payment card
            const refInput = document.querySelector('#FinalPaymentCard input[placeholder="XXXX-XXX-XXXXXX"]');
            const referenceNumber = refInput ? refInput.value.trim() : '';
            if (!referenceNumber) { alert('Please enter the payment reference number.'); return; }
            const proof = document.querySelector('#FinalPaymentCard input[type="file"]');
            if (!proof || !proof.files[0]) { alert('Please upload a screenshot of your payment.'); return; }

            try {
                const form = new FormData();
                form.append('action','submit_final_payment');
                form.append('order_id',currentOrderId);
                form.append('payment_method',paymentMethod);
                form.append('reference_number',referenceNumber);
                form.append('proof', proof.files[0]);
                const res = await fetch(ORDER_PROCESS_API, {method:'POST',body:form});
                const data = await res.json();
                if (data.success) {
                    alert('Final payment submitted successfully!');
                } else {
                    alert(data.error || 'Failed to submit final payment.');
                }
            } catch (err) {
                alert('Error submitting final payment.');
            }
        });
    });

    // Make checkbox options clickable (toggle active class)
    document.querySelectorAll('#PaymentCard .checkbox-option, #FinalPaymentCard .checkbox-option').forEach(function(label) {
        label.addEventListener('click', function() {
            // Within the same group, deactivate siblings
            const parent = this.closest('.option-row') || this.parentElement;
            parent.querySelectorAll('.box').forEach(function(b) { b.classList.remove('active'); });
            this.querySelector('.box').classList.add('active');

            // Recalculate the initial amount when Full Payment or 50% is selected.
            const paymentCard = this.closest('#PaymentCard');
            if (paymentCard) {
                const paymentGroups = paymentCard.querySelectorAll('.MoP-PT-Row > div');
                const paymentMethodGroup = paymentGroups[0];
                const paymentTypeGroup = paymentGroups[1];

                if (paymentMethodGroup && paymentMethodGroup.contains(this)) {
                    const method = this.dataset.paymentMethod;
                    const qrImage = document.getElementById('initialPaymentQr');
                    const logo = document.getElementById('initialPaymentLogo');
                    const accountName = document.getElementById('initialPaymentAccountName');
                    const accountNumber = document.getElementById('initialPaymentAccountNumber');
                    const isGCash = method === 'GCash';

                    if (qrImage) {
                        qrImage.src = isGCash
                            ? '../OrderProcessImgs/GcashQR.jfif'
                            : '../OrderProcessImgs/QR_code_for_mobile_English_Wikipedia 1.png';
                        qrImage.alt = isGCash ? 'GCash payment QR code' : 'Bank payment QR code';
                    }
                    if (logo) {
                        logo.style.display = isGCash ? '' : 'none';
                    }
                    if (accountName) accountName.textContent = isGCash ? 'SERVICES R.' : 'BANK';
                    if (accountNumber) accountNumber.textContent = isGCash ? '099******21' : 'Scan the bank QR to pay';
                }

                if (paymentTypeGroup && paymentTypeGroup.contains(this)) {
                    const fullAmount = Number(paymentCard.dataset.fullAmount || 0);
                    const amountToPay = this.textContent.includes('50%')
                        ? Math.round((fullAmount * 0.5 + Number.EPSILON) * 100) / 100
                        : fullAmount;
                    const amountElement = paymentCard.querySelector('#step3AmountToPay');
                    if (amountElement) amountElement.textContent = 'P' + amountToPay.toFixed(2);
                }
            }

            const finalPaymentCard = this.closest('#FinalPaymentCard');
            if (finalPaymentCard) {
                const finalGroups = finalPaymentCard.querySelectorAll('.MoP-PT-Row > div');
                const finalMethodGroup = finalGroups[0];
                if (finalMethodGroup && finalMethodGroup.contains(this)) {
                    const isGCash = this.dataset.paymentMethod === 'GCash';
                    const qrImage = document.getElementById('finalPaymentQr');
                    const logo = document.getElementById('finalPaymentLogo');
                    const accountName = document.getElementById('finalPaymentAccountName');
                    const accountNumber = document.getElementById('finalPaymentAccountNumber');
                    if (qrImage) {
                        qrImage.src = isGCash
                            ? '../OrderProcessImgs/GcashQR.jfif'
                            : '../OrderProcessImgs/QR_code_for_mobile_English_Wikipedia 1.png';
                        qrImage.alt = isGCash ? 'GCash payment QR code' : 'Bank payment QR code';
                    }
                    if (logo) logo.style.display = isGCash ? '' : 'none';
                    if (accountName) accountName.textContent = isGCash ? 'SERVICES R.' : 'BANK';
                    if (accountNumber) accountNumber.textContent = isGCash ? '099******21' : 'Scan the bank QR to pay';
                }
            }
        });
    });

    // Step 7: Customer confirms the order has been received.
    const confirmReceiptBtn = document.getElementById('s7ConfirmBtn');
    if (confirmReceiptBtn) {
        confirmReceiptBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!currentOrderId) { alert('No order loaded.'); return; }
            if (!confirm('Confirm that you have received this order?')) return;

            confirmReceiptBtn.disabled = true;
            try {
                const form = new FormData();
                form.append('action', 'confirm_received');
                form.append('order_id', currentOrderId);
                const proof = document.getElementById('s7PhotoInput');
                if (proof && proof.files[0]) form.append('proof', proof.files[0]);

                const res = await fetch(ORDER_PROCESS_API, { method: 'POST', body: form });
                const data = await res.json();
                if (data.success) {
                    alert(data.message || 'Receipt confirmed.');
                    // Jump to the final step (Order Completed) after confirming.
                    requestedStepNumber = 8;
                    loadOrderProcess();
                } else {
                    alert(data.error || 'Failed to confirm receipt.');
                    confirmReceiptBtn.disabled = false;
                }
            } catch (err) {
                alert('Error confirming receipt.');
                confirmReceiptBtn.disabled = false;
            }
        });
    }
});

function updateCancellationButtons() {
    document.querySelectorAll('[data-cancel-step]').forEach(button => {
        button.hidden = Number(button.dataset.cancelStep) !== cancellableStep;
    });
}

function initializeCancellationModal() {
    const overlay = document.getElementById('cancelOrderOverlay');
    if (!overlay) return;

    const confirmButton = overlay.querySelector('.cancel-modal-confirm');
    const closeButtons = overlay.querySelectorAll('.cancel-modal-close, .cancel-modal-keep');
    const error = document.getElementById('cancelOrderError');

    const closeModal = () => {
        if (confirmButton.disabled) return;
        overlay.hidden = true;
        document.body.classList.remove('cancel-modal-open');
        if (error) {
            error.hidden = true;
            error.textContent = '';
        }
    };

    document.querySelectorAll('[data-cancel-step]').forEach(button => {
        button.addEventListener('click', () => {
            if (Number(button.dataset.cancelStep) !== cancellableStep) return;
            overlay.hidden = false;
            document.body.classList.add('cancel-modal-open');
            confirmButton.focus();
        });
    });

    closeButtons.forEach(button => button.addEventListener('click', closeModal));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !overlay.hidden) closeModal();
    });

    confirmButton.addEventListener('click', async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = 'Cancelling...';
        if (error) error.hidden = true;

        try {
            const response = await fetch(ORDER_PROCESS_API, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'cancel_order', order_id: currentOrderId})
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Unable to cancel this order.');
            window.location.replace('../../MyOrders/Myorder.html?tab=cancelled');
        } catch (requestError) {
            if (error) {
                error.textContent = requestError.message || 'Unable to cancel this order. Please try again.';
                error.hidden = false;
            }
            confirmButton.disabled = false;
            confirmButton.textContent = 'Confirm Cancellation';
        }
    });
}
