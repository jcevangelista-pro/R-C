
    // TODO: replace these placeholder handlers with real API calls
    // (e.g. PATCH /api/orders/{id}/accept, PATCH /api/orders/{id}/reject)
    // once the Laravel backend is wired up.

    function acceptOrder(orderId) {
      console.log('Accept order:', orderId);
    }

    function rejectOrder(orderId) {
      console.log('Reject order:', orderId);
    }

    function viewOrder(orderId) {
      console.log('View order details:', orderId);
    }


    
    /* ===== ADDED: Order Details modal data + open/close functions ===== */

    // Fills in the Order Details modal and shows it.
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

      // Swap the status badge color to match the status being shown.
      const statusEl = document.getElementById('orderDetailStatus');
      statusEl.textContent = status;
      statusEl.className = 'order-status-badge ' +
        (status === 'DELIVERED' ? 'order-status-delivered' :
         status === 'CANCELLED' ? 'order-status-cancelled' : 'order-status-processing');

      document.getElementById('orderDetailOverlay').classList.add('show');
    }

    function closeOrderDetailModal() {
      document.getElementById('orderDetailOverlay').classList.remove('show');
    }
    /* ===== END ADDED: Order Details modal data + open/close functions ===== */

    

    /* ============================================================ */
    /* ===== ADDED: Order Review Status modal functions ===== */
    /* ===== These are intentionally NOT attached to any button. */
    /* ===== Call openOrderReviewModal() yourself wherever you   */
    /* ===== want the wizard to start (e.g. an arrow/row click). */
    /* ============================================================ */
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
        // Step 6 (Out for Delivery) approved — the review wizard is complete.
        // TODO: hook this up to a real "mark order as delivered" API call.
        console.log('Order review completed — all steps approved.');
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
    /* ===== END ADDED: Order Review Status modal functions ===== */