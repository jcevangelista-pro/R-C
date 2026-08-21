const ORDER_PROCESS_API = 'orderprocess_api.php';
let currentOrderId = null;
let currentUserId = null;
let orderMessages = [];
let orderSteps = [];

document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.nav-tabs[role="tablist"] > li');
    const panes = document.querySelectorAll('.tab-content > .tab-pane');

    // Get order ID from URL
    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('order');

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
        const activeIndex = currentActiveStep - 1;
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
                    if (vals[1]) vals[1].textContent = 'P' + (remaining + deliveryFee).toFixed(2);
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
            <div class="chat-sender">${senderLabel}</div>
            <div>${msg.message}</div>
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
                const res = await fetch(ORDER_PROCESS_API, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        action: 'submit_payment',
                        order_id: currentOrderId,
                        payment_method: paymentMethod,
                        payment_type: paymentType,
                        reference_number: referenceNumber
                    })
                });
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

            // Get reference number from final payment card
            const refInput = document.querySelector('#FinalPaymentCard input[placeholder="XXXX-XXX-XXXXXX"]');
            const referenceNumber = refInput ? refInput.value.trim() : '';

            try {
                const res = await fetch(ORDER_PROCESS_API, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        action: 'submit_final_payment',
                        order_id: currentOrderId,
                        reference_number: referenceNumber
                    })
                });
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
        });
    });
});
