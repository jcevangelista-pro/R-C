
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

    

    // PROCESS FUNCTION
    
    let reviewCurrentStep = 2;
    let reviewQuantityValue = 2;
 
    const reviewStepLabels = {
      2: 'VERIFICATION',
      3: 'INITIAL PAYMENT',
      4: 'PROCESSING ORDER',
      5: 'FINAL PAYMENT',
      6: 'OUT FOR DELIVERY'
    };
 
    // Call this to open the modal, optionally starting on a specific step.
    // e.g. openOrderReviewModal('ORD-2026-00124') or openOrderReviewModal('ORD-2026-00124', 4)
    function openOrderReviewModal(orderId, startStep) {
      // TODO: fetch the order's actual review data from the Laravel backend
      // and populate the fields below instead of using the placeholder values.
      goToOrderReviewStep(startStep || 2);
      document.getElementById('orderReviewOverlay').classList.add('show');
    }
 
    function closeOrderReviewModal() {
      document.getElementById('orderReviewOverlay').classList.remove('show');
    }
 
    // Shows the content for the given step (2-6) and hides the rest.
    function goToOrderReviewStep(step) {
      reviewCurrentStep = step;
      for (let s = 2; s <= 6; s++) {
        const stepEl = document.getElementById('reviewStep' + s);
        if (stepEl) stepEl.style.display = (s === step) ? 'block' : 'none';
      }
      document.getElementById('reviewStepNumber').textContent = 'STEP ' + step + ':';
      document.getElementById('reviewStepLabel').textContent = reviewStepLabels[step] || '';
    }
 
    // Called by the APPROVE button. Advances to the next step, or closes
    // the modal once step 6 (Out for Delivery) has been approved.
    function approveOrderReviewStep() {
      // TODO: send the approval for reviewCurrentStep to the Laravel backend
      // (e.g. PATCH /api/orders/{id}/review-step) before moving on.
      if (reviewCurrentStep < 6) {
        goToOrderReviewStep(reviewCurrentStep + 1);
      } else {
        closeOrderReviewModal();
      }
    }
 
    // Quantity stepper on Step 2 (Verification).
    function reviewChangeQuantity(delta) {
      reviewQuantityValue = Math.max(1, reviewQuantityValue + delta);
      document.getElementById('reviewQuantity').textContent = reviewQuantityValue;
      // TODO: recalculate Price / Total Price / Amount Reducted / New Product Total
      // based on the updated quantity once real pricing data is connected.
    }
 
    // "View Photo" links on Steps 3 and 5.
    function reviewViewPhoto(which) {
      // TODO: open the actual uploaded payment screenshot for `which`
      // ('initialPayment' or 'finalPayment') once file storage is wired up.
      console.log('View payment screenshot for:', which);
    }
    /* ===== END ADDED: Order Review Status modal functions ===== */
