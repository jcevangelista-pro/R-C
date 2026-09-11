const ORDER_PROCESS_API = 'orderprocess_api.php';
let currentOrderId = null;
let currentUserId = null;
let orderMessages = [];
let orderSteps = [];
let requestedStepNumber = null;
let cancellableStep = null;
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
        if (!orderSteps || orderSteps.length === 0) return;

        const tabs = document.querySelectorAll('.nav-tabs[role="tablist"] > li');
        const panes = document.querySelectorAll('.tab-content > .tab-pane');
        if (!tabs || !panes) return;

        // Find the highest completed step number
        let highestCompleted = 0;
        let currentActiveStep = 1;

        orderSteps.forEach(function(step) {
            const stepNum = parseInt(step.step_number);
            if (step.status === 'Completed') {
                highestCompleted = Math.max(highestCompleted, stepNum);
            }
            if (step.status === 'In Progress') {
                currentActiveStep = stepNum;
            }
        });

        // Allow access to completed steps + current active step only
        const maxAccessible = Math.max(highestCompleted + 1, currentActiveStep);

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

        // Show the current active step on load
        const visibleStep = requestedStepNumber && requestedStepNumber <= maxAccessible
            ? requestedStepNumber
            : currentActiveStep;
        const activeIndex = visibleStep - 1;
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
                // Second od-inline-row has: Product Balance, Amount to Pay
                const allRows = finalPaymentCard.querySelectorAll('.od-inline-row');
                if (allRows[0]) {
                    const vals = allRows[0].querySelectorAll('.stat-value');
                    if (vals[0]) vals[0].textContent = 'P' + deliveryFee.toFixed(2);
                }
                if (allRows[1]) {
                    const vals = allRows[1].querySelectorAll('.stat-value');
                    if (vals[0]) vals[0].textContent = 'P' + remaining.toFixed(2);
                    if (vals[1]) vals[1].textContent = 'P' + remaining.toFixed(2);
                }
            }
        }

        renderAllChats();

        // Apply step locks after data is loaded
        if (typeof applyStepLocks === 'function') {
            applyStepLocks();
        }

    } catch (err) {
        console.error('Failed to load order process:', err);
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
        const time = msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '';

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

            try {
                const form = new FormData();
                form.append('action','submit_payment');
                form.append('order_id',currentOrderId);
                form.append('payment_method',paymentMethod);
                form.append('payment_type',paymentType);
                form.append('reference_number',referenceNumber);
                const proof = document.querySelector('#PaymentCard input[type="file"]');
                if (proof && proof.files[0]) form.append('proof', proof.files[0]);
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

            try {
                const form = new FormData();
                form.append('action','submit_final_payment');
                form.append('order_id',currentOrderId);
                form.append('payment_method',paymentMethod);
                form.append('reference_number',referenceNumber);
                const proof = document.querySelector('#FinalPaymentCard input[type="file"]');
                if (proof && proof.files[0]) form.append('proof', proof.files[0]);
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
