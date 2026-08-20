/* ================= STATE ================= */
let selectedIndexes = new Set();
let deliveryMethod = "delivery"; // "delivery" | "pickup"
let deliverySaved = false;
let deliveryInfo = {
  method: "delivery",
  name: "",
  address: "",
  phone: "",
  email: ""
};
 
let activeItemIndex = 0;
 
const RUSH_FEE_RATE = 0.8; // 80% additional fee on rush orders
 
/* ================= HELPERS ================= */
function money(n){
  return "P" + n.toFixed(2);
}
 
function itemTotal(item){
  let total = item.price * item.qty;
  if (item.orderType === 'rush') total *= (1 + RUSH_FEE_RATE);
  return total;
}
 
function selectedTotal(){
  let sum = 0;
  selectedIndexes.forEach(idx => {
    const item = cartItems[idx];
    if (item) sum += itemTotal(item);
  });
  return sum;
}
 
function updateCartBadge(){
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = cartItems.length;
}
 
/* ================= RENDER CART ROWS ================= */
function renderCartRows(){
  const wrap = document.getElementById('cartRows');
  wrap.innerHTML = cartItems.map((item, idx) => {
    const imgHtml = item.image
      ? `<img src="../Products/${item.image}" style="width:6vw;height:6vw;object-fit:cover;border-radius:8px;">`
      : `<div style="width:6vw;height:6vw;background:#e5e7eb;border-radius:8px;"></div>`;

    return `
    <div class="cart-row ${selectedIndexes.has(idx) ? 'selected' : ''}" data-index="${idx}">
      <span class="radio-dot" data-radio-index="${idx}"></span>
      <div class="row-thumb">${imgHtml}</div>
      <div>
        <div class="row-name">${item.name}</div>
        <div class="row-category">${item.category}</div>
      </div>
      <div class="row-price">${money(item.price)}</div>
      <div class="row-qty">${item.qty}</div>
      <div class="row-total">${money(itemTotal(item))}</div>
      <div class="row-chevron" data-chevron-index="${idx}">›</div>
    </div>`;
  }).join('');
 
  wrap.querySelectorAll('.radio-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(dot.dataset.radioIndex, 10);
      if (selectedIndexes.has(idx)){
        selectedIndexes.delete(idx);
      } else {
        selectedIndexes.add(idx);
      }
      renderCartRows();
    });
  });
 
  wrap.querySelectorAll('.row-chevron').forEach(chev => {
    chev.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(chev.dataset.chevronIndex, 10);
      openOrderModal(idx);
    });
  });
 
  document.getElementById('cartTitle').textContent = `My Cart (${cartItems.length})`;
  document.getElementById('cartTotal').textContent = money(selectedTotal());
  updateCartBadge();
}
 
/* ================= DELIVERY DETAILS MODAL ================= */
const deliveryModal = document.getElementById('deliveryOverlay');
const deliveryToggleBtn = document.getElementById('deliveryToggleBtn');
const deliveryToggleLabel = document.getElementById('deliveryToggleLabel');
const deliveryBackBtn = document.getElementById('deliveryBackBtn');
const deliveryDoneBtn = document.getElementById('deliveryDoneBtn');
const dotDelivery = document.getElementById('dotDelivery');
const dotPickup = document.getElementById('dotPickup');
const deliveryFieldsDelivery = document.getElementById('deliveryFieldsDelivery');
const deliveryFieldsPickup = document.getElementById('deliveryFieldsPickup');
 
function renderDeliverySelection(){
  dotDelivery.classList.toggle('active', deliveryMethod === 'delivery');
  dotPickup.classList.toggle('active', deliveryMethod === 'pickup');
  deliveryFieldsDelivery.style.display = deliveryMethod === 'delivery' ? '' : 'none';
  deliveryFieldsPickup.style.display = deliveryMethod === 'pickup' ? '' : 'none';
}
 
function openDeliveryModal(){
  closeOrderModal();
  closeSummaryModal();
  renderDeliverySelection();

  // Load saved delivery info from DB
  fetch('cart_api.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ action: 'get_delivery' })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success && data.delivery) {
      const d = data.delivery;
      document.getElementById('fldFirstName').value = d.first_name || '';
      document.getElementById('fldMiddleName').value = d.middle_name || '';
      document.getElementById('fldLastName').value = d.last_name || '';
      document.getElementById('fldEmail').value = d.email || '';
      document.getElementById('fldPhone').value = d.phone_num || '';

      // Parse address into fields if it contains commas
      if (d.address && d.address !== '—' && d.address.trim()) {
        document.getElementById('fldAddress').value = d.address;
      }
    }
  })
  .catch(() => {});

  deliveryModal.classList.add('open');
}
 
function closeDeliveryModal(){
  deliveryModal.classList.remove('open');
}
 
deliveryToggleBtn.addEventListener('click', () => {
  if (deliveryModal.classList.contains('open')){
    closeDeliveryModal();
  } else {
    openDeliveryModal();
  }
});
 
deliveryBackBtn.addEventListener('click', closeDeliveryModal);
 
deliveryModal.addEventListener('click', (e) => {
  if (e.target === deliveryModal) closeDeliveryModal();
});
 
function val(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
 
deliveryDoneBtn.addEventListener('click', () => {
  deliverySaved = true;
  deliveryToggleLabel.textContent = "EDIT DELIVERY DETAILS";
 
  deliveryInfo.method = deliveryMethod;
 
  if (deliveryMethod === 'delivery'){
    const fullName = [val('fldFirstName'), val('fldMiddleName'), val('fldLastName')].filter(Boolean).join(' ');
    const addressParts = [val('fldAddress'), val('fldBarangay'), val('fldCity'), val('fldProvince')].filter(Boolean).join(', ');
    const zip = val('fldZip');
    deliveryInfo.name = fullName || "Guest Customer";
    deliveryInfo.address = (addressParts + (zip ? ', ' + zip : '')) || "No address provided";
    deliveryInfo.phone = val('fldPhone') || "09XX-XXX-XXXX";
    deliveryInfo.email = val('fldEmail') || "";

    // Save to database
    fetch('cart_api.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'save_delivery',
        phone_num: deliveryInfo.phone,
        address: deliveryInfo.address,
        email: deliveryInfo.email
      })
    }).catch(() => {});

  } else {
    deliveryInfo.name = "R&C Printing Services (Pickup)";
    deliveryInfo.address = "St. Joseph Windfield 2 Village, Cabuyao City, Laguna";
    deliveryInfo.phone = val('fldMobile') || "09XX-XXX-XXXX";
    deliveryInfo.email = "";
  }
 
  closeDeliveryModal();
});
 
dotDelivery.parentElement.addEventListener('click', () => {
  deliveryMethod = 'delivery';
  renderDeliverySelection();
});
 
dotPickup.parentElement.addEventListener('click', () => {
  deliveryMethod = 'pickup';
  renderDeliverySelection();
});
 
/* ================= ORDER DETAILS MODAL ================= */
const orderModal = document.getElementById('orderOverlay');
const orderBackBtn = document.getElementById('orderBackBtn');
const orderDoneBtn = document.getElementById('orderDoneBtn');
const boxUpload = document.getElementById('boxUpload');
const boxRequest = document.getElementById('boxRequest');
const boxNormal = document.getElementById('boxNormal');
const boxRush = document.getElementById('boxRush');
const orderTypeNote = document.getElementById('orderTypeNote');
const designNote = document.getElementById('designNote');
 
function renderOrderModal(){
  const item = cartItems[activeItemIndex];
 
  document.getElementById('odName').textContent = item.name;
  document.getElementById('odCategory').textContent = item.category;
  document.getElementById('odQtyInput').value = item.qty;
  document.getElementById('odPrice').textContent = money(item.price);
  document.getElementById('odTotalPrice').textContent = money(itemTotal(item));
  document.getElementById('odTotalFooter').textContent = money(itemTotal(item));
 
  boxUpload.classList.toggle('active', item.designSelection === 'upload');
  boxRequest.classList.toggle('active', item.designSelection === 'request');
  boxNormal.classList.toggle('active', item.orderType === 'normal');
  boxRush.classList.toggle('active', item.orderType === 'rush');
 
  designNote.style.display = item.designSelection === 'request' ? '' : 'none';
 
  const descriptionField = document.getElementById('odDescription');
  descriptionField.value = item.description || "";
  descriptionField.placeholder = item.designSelection === 'request'
    ? "Describe how you want the uploaded reference photo to be edited, arranged, or printed."
    : "Describe how you want the uploaded photo to be edited, arranged, or printed.";
 
  const photoPreview = document.getElementById('photoPreview');
  const photoIcon = document.getElementById('photoUploadIcon');
  if (item.photo){
    photoPreview.src = item.photo;
    photoPreview.style.display = '';
    photoIcon.style.display = 'none';
  } else {
    photoPreview.style.display = 'none';
    photoIcon.style.display = '';
  }
}
 
function openOrderModal(idx){
  activeItemIndex = idx;
  closeDeliveryModal();
  closeSummaryModal();
  renderOrderModal();
  orderModal.classList.add('open');
}
 
function closeOrderModal(){
  orderModal.classList.remove('open');
}
 
orderBackBtn.addEventListener('click', closeOrderModal);
orderDoneBtn.addEventListener('click', () => {
  cartItems[activeItemIndex].description = document.getElementById('odDescription').value;
  closeOrderModal();
  renderCartRows();
});

// Remove item from cart
const orderRemoveBtn = document.getElementById('orderRemoveBtn');
orderRemoveBtn.addEventListener('click', async () => {
  const item = cartItems[activeItemIndex];
  if (!confirm(`Are you sure you want to remove "${item.name}" from your cart?`)) return;

  // Remove from database
  if (item.cart_id) {
    await fetch('cart_api.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'remove', cart_id: item.cart_id })
    });
  }

  // Remove from local array
  cartItems.splice(activeItemIndex, 1);
  selectedIndexes.clear();
  closeOrderModal();
  renderCartRows();
});
 
orderModal.addEventListener('click', (e) => {
  if (e.target === orderModal) closeOrderModal();
});
 
boxUpload.parentElement.addEventListener('click', () => {
  cartItems[activeItemIndex].designSelection = 'upload';
  renderOrderModal();
});
 
boxRequest.parentElement.addEventListener('click', () => {
  cartItems[activeItemIndex].designSelection = 'request';
  renderOrderModal();
});
 
boxNormal.parentElement.addEventListener('click', () => {
  cartItems[activeItemIndex].orderType = 'normal';
  renderOrderModal();
  renderCartRows();
});
 
boxRush.parentElement.addEventListener('click', () => {
  cartItems[activeItemIndex].orderType = 'rush';
  renderOrderModal();
  renderCartRows();
});
 
document.getElementById('odQtyInput').addEventListener('input', (e) => {
  const item = cartItems[activeItemIndex];
  let v = parseInt(e.target.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  item.qty = v;
  renderOrderModal();
  renderCartRows();

  // Sync to database
  if (item.cart_id) {
    fetch('cart_api.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'update_qty', cart_id: item.cart_id, quantity: v })
    }).catch(() => {});
  }
});
 
document.getElementById('orderPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
 
  const reader = new FileReader();
  reader.onload = () => {
    cartItems[activeItemIndex].photo = reader.result;
    renderOrderModal();
  };
  reader.readAsDataURL(file);
});
 
/* ================= ORDER SUMMARY MODAL (Check Out) ================= */
const summaryModal = document.getElementById('summaryOverlay');
const summaryBackBtn = document.getElementById('summaryBackBtn');
const summaryNextBtn = document.getElementById('summaryNextBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const summaryCheckoutBtn = document.getElementById('summaryCheckoutBtn');
 
let checkoutIndexes = [];
let summaryPointer = 0;
 
function renderSummaryModal(){
  const idx = checkoutIndexes[summaryPointer];
  const item = cartItems[idx];
  if (!item) return;
 
  document.getElementById('sumDeliveryVia').textContent =
    deliveryInfo.method === 'pickup' ? 'Pickup' : 'Delivery (via Lalamove)';
  document.getElementById('sumCustomerName').textContent = deliveryInfo.name || "Guest Customer";
  document.getElementById('sumCustomerAddress').textContent = deliveryInfo.address || "No address provided";
  document.getElementById('sumCustomerPhone').textContent = deliveryInfo.phone || "09XX-XXX-XXXX";
 
  const emailEl = document.getElementById('sumCustomerEmail');
  if (deliveryInfo.email){
    emailEl.textContent = deliveryInfo.email;
    emailEl.style.display = '';
  } else {
    emailEl.style.display = 'none';
  }
 
  document.getElementById('sumName').textContent = item.name;
  document.getElementById('sumCategory').textContent = item.category;
  document.getElementById('sumQty').textContent = item.qty;
  document.getElementById('sumPrice').textContent = money(item.price);
  document.getElementById('sumTotalPrice').textContent = money(itemTotal(item));
 
  document.getElementById('sumDesignLabel').textContent =
    item.designSelection === 'request' ? 'Request photo customization' : 'Upload own photo/design';
  document.getElementById('sumOrderTypeLabel').textContent =
    item.orderType === 'rush' ? 'Rush Order' : 'Normal Order';
 
  const sumPhotoPreview = document.getElementById('sumPhotoPreview');
  const sumPhotoIcon = document.getElementById('sumPhotoIcon');
  if (item.photo){
    sumPhotoPreview.src = item.photo;
    sumPhotoPreview.style.display = '';
    sumPhotoIcon.style.display = 'none';
  } else {
    sumPhotoPreview.style.display = 'none';
    sumPhotoIcon.style.display = '';
  }
 
  document.getElementById('sumDescription').textContent = item.description && item.description.trim()
    ? item.description
    : "No description provided.";
 
  const overallTotal = checkoutIndexes.reduce((sum, i) => sum + itemTotal(cartItems[i]), 0);
  const itemLabel = checkoutIndexes.length === 1 ? "ITEM" : "ITEMS";
  document.getElementById('sumTotalFooter').textContent =
    `TOTAL: ${money(overallTotal)} (${checkoutIndexes.length} ${itemLabel})`;
 
  summaryNextBtn.style.display = checkoutIndexes.length > 1 ? '' : 'none';
}
 
function openSummaryModal(){
  if (selectedIndexes.size === 0){
    alert("Please select at least one item (tap the circle) before checking out.");
    return;
  }
 
  checkoutIndexes = Array.from(selectedIndexes);
  summaryPointer = 0;
  closeDeliveryModal();
  closeOrderModal();
  renderSummaryModal();
  summaryModal.classList.add('open');
}
 
function closeSummaryModal(){
  summaryModal.classList.remove('open');
}
 
checkoutBtn.addEventListener('click', openSummaryModal);
summaryBackBtn.addEventListener('click', closeSummaryModal);
 
summaryModal.addEventListener('click', (e) => {
  if (e.target === summaryModal) closeSummaryModal();
});
 
summaryNextBtn.addEventListener('click', () => {
  summaryPointer = (summaryPointer + 1) % checkoutIndexes.length;
  renderSummaryModal();
});
 
summaryCheckoutBtn.addEventListener('click', () => {
  // Remove checked-out items from the cart (highest index first so splicing doesn't shift earlier indexes)
  const sortedIndexes = [...checkoutIndexes].sort((a, b) => b - a);
  sortedIndexes.forEach(idx => {
    cartItems.splice(idx, 1);
  });
 
  selectedIndexes.clear();
  closeSummaryModal();
  renderCartRows();
});
 
/* ================= INIT ================= */
renderCartRows();
 
















