function renderRows(list){
  const wrap = document.getElementById('tableWrap');
  wrap.innerHTML = list.map((c, i) => `
    <div class="row">
      <div class="name-cell"><span class="checkbox"></span> ${c.name}</div>
      <div class="contact">${c.contact}</div>
      <div class="address">${c.address}</div>
      <div class="icon-cell" data-index="${i}" role="button" title="View order records">📋</div>
    </div>
  `).join('');
 
  // Attach click handlers to the icon in each row (uses the filtered list currently shown)
  wrap.querySelectorAll('.icon-cell').forEach(el => {
    el.addEventListener('click', () => {
      const customer = list[parseInt(el.dataset.index, 10)];
      openOrderModal(customer);
    });
  });
}
 
renderRows(customers);
 
const searchInput = document.querySelector('.search-box input');
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.contact.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
  renderRows(filtered);
});
 
/* ================= ORDER RECORDS MODAL ================= */
const orderModalOverlay = document.getElementById('orderModalOverlay');
const orderModalClose = document.getElementById('orderModalClose');
const orderRecordsView = document.getElementById('orderRecordsView');
const orderSummaryView = document.getElementById('orderSummaryView');
const summaryBackBtn = document.getElementById('summaryBackBtn');
const summaryNextBtn = document.getElementById('summaryNextBtn');
 
let activeCustomer = null;
let activeOrderIndex = 0;
 
function statusClass(status){
  const s = status.toLowerCase();
  if (s === 'completed') return '';
  if (s === 'pending') return 'pending';
  if (s === 'cancelled') return 'cancelled';
  return '';
}
 
function openOrderModal(customer){
  activeCustomer = customer;
 
  document.getElementById('modalCustomerName').textContent = customer.name;
  document.getElementById('modalCustomerAddress').textContent = customer.address;
  document.getElementById('modalCustomerPhone').textContent = customer.contact;
 
  const orders = customer.orders || [];
  const itemsWrap = document.getElementById('orderItemsWrap');
 
  if (orders.length === 0){
    itemsWrap.innerHTML = `<p style="padding:20px 0; font-size:13px; color:#8b8b9a;">No order records yet.</p>`;
  } else {
    itemsWrap.innerHTML = orders.map((o, idx) => `
      <div class="order-item">
        <div class="item-thumb" style="background: linear-gradient(135deg, #2b2f68, #6b6fd6);"></div>
        <div>
          <a href="#" class="item-name">${o.name}</a>
          <div class="item-category">${o.category}</div>
        </div>
        <div class="item-qty">${o.qty}</div>
        <div class="status-wrap">
          <span class="order-status ${statusClass(o.status)}">${o.status.toUpperCase()}</span>
          <button class="see-details" data-order-index="${idx}">SEE DETAILS</button>
        </div>
      </div>
    `).join('');
 
    itemsWrap.querySelectorAll('.see-details').forEach(btn => {
      btn.addEventListener('click', () => {
        openOrderSummary(customer, parseInt(btn.dataset.orderIndex, 10));
      });
    });
  }
 
  showRecordsView();
  orderModalOverlay.classList.add('open');
  orderRecordsView.scrollTop = 0;
}
 
function showRecordsView(){
  orderRecordsView.style.display = '';
  orderSummaryView.style.display = 'none';
}
 
function showSummaryView(){
  orderRecordsView.style.display = 'none';
  orderSummaryView.style.display = '';
}
 
/* Derive full order-summary details from the simple order record.
   This fills in price, discount, delivery info, timeline, etc. so
   every order has a consistent "Order Summary" page. */
function buildOrderDetails(order){
  const priceMap = {
    "Tumbler (360ml)": 45,
    "Ceramic Mug (11oz)": 60,
    "Tarpaulin (3x5ft)": 250,
    "T-Shirt (Sublimation)": 220,
    "Sticker Sheet (A4)": 30,
    "Business Cards (100pcs)": 180,
    "Photo Print (4x6)": 8
  };
 
  const price = priceMap[order.name] || 100;
  const discount = 10;
  const totalPrice = price * order.qty * (1 - discount / 100);
  const deliveryFee = 50;
  const totalPaid = totalPrice + deliveryFee;
 
  const statusMap = {
    completed: { payment: "FULLY PAID", delivery: "DELIVERED", orderType: "STANDARD", orderStatus: "COMPLETED" },
    pending:   { payment: "PARTIALLY PAID", delivery: "PROCESSING", orderType: "RUSH", orderStatus: "CURRENT" },
    cancelled: { payment: "REFUNDED", delivery: "CANCELLED", orderType: "STANDARD", orderStatus: "CANCELLED" }
  };
  const meta = statusMap[order.status.toLowerCase()] || statusMap.completed;
 
  const timeline = [
    { label: "ORDER DETAILS",   date: "MAY 25, 2026 | 3:37 PM" },
    { label: "VERIFICATION",    date: "MAY 25, 2026 | 5:30 PM" },
    { label: "PAYMENT METHOD",  date: "MAY 25, 2026 | 7:00 PM" },
    { label: "PROCESSING",      date: "MAY 25, 2026 | 10:00 PM" },
    { label: "FINAL PAYMENT",   date: "MAY 25, 2026 | 11:00 PM" },
    { label: "OUT FOR DELIVERY",date: "MAY 26, 2026 | 12:00 PM" },
    { label: "ORDER COMPLETE",  date: "MAY 26, 2026 | 2:00 PM" }
  ];
 
  return {
    price, discount, totalPrice, deliveryFee, totalPaid,
    deliveryDate: "MAY 26, 2026<br>12:00 PM",
    paymentStatus: meta.payment,
    deliveryStatus: meta.delivery,
    orderType: meta.orderType,
    orderStatus: meta.orderStatus,
    timeline
  };
}
 
function money(n){
  return "P" + n.toFixed(2);
}
 
function openOrderSummary(customer, orderIndex){
  activeCustomer = customer;
  activeOrderIndex = orderIndex;
 
  const order = customer.orders[orderIndex];
  const details = buildOrderDetails(order);
 
  document.getElementById('summaryCustomerName').textContent = customer.name;
  document.getElementById('summaryCustomerAddress').textContent = customer.address;
  document.getElementById('summaryCustomerPhone').textContent = customer.contact;
 
  document.getElementById('summaryItemName').textContent = order.name;
  document.getElementById('summaryItemCategory').textContent = order.category;
  document.getElementById('summaryQty').textContent = order.qty;
  document.getElementById('summaryDeliveryDate').innerHTML = details.deliveryDate;
 
  document.getElementById('summaryThumb').style.background = "linear-gradient(135deg, #2b2f68, #6b6fd6)";
 
  document.getElementById('summaryPrice').textContent = money(details.price);
  document.getElementById('summaryDiscount').textContent = details.discount + "%";
  document.getElementById('summaryTotalPrice').textContent = money(details.totalPrice);
  document.getElementById('summaryDeliveryFee').textContent = money(details.deliveryFee);
 
  document.getElementById('summaryPaymentStatus').textContent = details.paymentStatus;
  document.getElementById('summaryDeliveryStatus').textContent = details.deliveryStatus;
  document.getElementById('summaryOrderType').textContent = details.orderType;
 
  document.getElementById('summaryTimeline').innerHTML = details.timeline.map(t => `
    <div class="timeline-row">
      <span>${t.label}</span>
      <span class="timeline-date">${t.date}</span>
    </div>
  `).join('');
 
  document.getElementById('summaryStatusLeft').textContent = details.orderStatus;
  document.getElementById('summaryTotalPaid').textContent = money(details.totalPaid);
  document.getElementById('summaryStatusRight').textContent = details.orderStatus;
 
  showSummaryView();
  orderSummaryView.scrollTop = 0;
}
 
function closeOrderModal(){
  orderModalOverlay.classList.remove('open');
}
 
orderModalClose.addEventListener('click', closeOrderModal);
 
summaryBackBtn.addEventListener('click', showRecordsView);
 
summaryNextBtn.addEventListener('click', () => {
  if (!activeCustomer || !activeCustomer.orders || activeCustomer.orders.length === 0) return;
  const nextIndex = (activeOrderIndex + 1) % activeCustomer.orders.length;
  openOrderSummary(activeCustomer, nextIndex);
});
 
orderModalOverlay.addEventListener('click', (e) => {
  if (e.target === orderModalOverlay) closeOrderModal();
});
 
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOrderModal();
});
 