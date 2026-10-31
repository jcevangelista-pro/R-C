<?php require_once __DIR__ . '/../Registration/admin_guard.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inventory - R&C Printing Services</title>
<link rel="icon" type="image/x-icon" href="../imgs/image 2.png">
<link rel="stylesheet" href="inventory.css">
<style>
  .owner-tag { position: relative; cursor: pointer; }
  .logout-dropdown { display:none; position:absolute; top:100%; right:0; background:#fff; border:1px solid #ec4899; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.12); padding:6px 0; z-index:1000; min-width:120px; }
  .owner-tag.open .logout-dropdown { display:block; }
  .logout-dropdown a { display:block; padding:10px 18px; color:#ef4444; font-weight:700; font-size:13px; text-decoration:none; }
  .logout-dropdown a:hover { background:#fff0f3; }
</style>
</head>
<body>

  <div class="sidebar">
    <div class="brand">
      <img src="../imgs/image 2.png" alt="">
      <div class="brand-text">R&amp;C PRINTING<br>SERVICES</div>
    </div>
    <div class="nav-label">MAIN</div>
    <a class="nav-item" href="../Dashboard/Dashboard.html"><span>Dashboard</span> <span class="nav-icon"><img src="../imgs/Performance Macbook.png" alt=""></span></a>
    <a class="nav-item active"><span>Inventory</span> <span class="nav-icon"><img src="../imgs/Boxes.png" alt=""></span></a>
    <a class="nav-item" href="../Order/order-admin.html"><span>Orders</span> <span class="nav-icon"><img src="../imgs/Shopping Cart.png" alt=""></span></a>
    <a class="nav-item" href="../CUSTOMER/CustomerLand.html"><span>Customer</span> <span class="nav-icon"><img src="../imgs/User Male.png" alt=""></span></a>
    <a class="nav-item" href="../Products/AdminProduct.html"><span>Products</span> <span class="nav-icon"><img src="../imgs/Product.png" alt=""></span></a>
    <?php if ($loggedInRole === 'Owner'): ?>
    <a class="nav-item" href="../UserSystem/UserSystem.html"><span>Users</span> <span class="nav-icon"><img src="../imgs/user.png" alt=""></span></a>
    <?php endif; ?>
  </div>

  <div class="main">
    <div class="topbar">
      <h1 style="font-size: 50px;">Inventory</h1>
      <div class="owner-tag" id="ownerTag">
        <span><?php echo $loggedInRole; ?></span>
        <div class="owner-"><img src="../imgs/Test Account.png" alt=""></div>
        <div class="logout-dropdown">
          <a href="#" id="logoutBtn">LOG OUT</a>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="search-box">
          <input type="text" placeholder="" id="searchInput"><img src="../imgs/Search.png" alt="">
        </div>
        <?php if ($loggedInRole === 'Owner'): ?>
        <button class="btn-add-material" id="addMaterialBtn" style="background:#ec4899;color:#fff;border:none;border-radius:6px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;margin-right:12px;">+ Add Material</button>
        <?php endif; ?>
        <div class="filter-link" id="filterLink"><img src="../imgs/Funnel.png" alt=""> Filter</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ITEM</th>
            <th>CATEGORY</th>
            <th>STOCK</th>
            <th>UNIT</th>
            <th>STATUS</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="inventoryBody">
          <tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px;">Loading...</td></tr>
        </tbody>
      </table>
      <div id="invSeeAllWrap" style="display:none;text-align:center;margin-top:14px;">
        <button type="button" id="invSeeAllBtn" style="background:#ec4899;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-weight:700;font-size:14px;cursor:pointer;">See All Items</button>
      </div>
    </div>

    <!-- Archive history table -->
    <div class="history-panel">
      <div class="history-header">
        <h2>Archive History</h2>
      </div>
      <table class="history-table">
        <thead>
          <tr>
            <th>ITEM</th>
            <th>CATEGORY</th>
            <th>UNIT</th>
            <th>DATE ARCHIVED</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="archiveBody">
          <tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px;">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Update history table -->
    <div class="history-panel">
      <div class="history-header">
        <h2>Update History</h2>
      </div>
      <table class="history-table">
        <thead>
          <tr>
            <th>ITEM NAME</th>
            <th>ACTION</th>
            <th>QUANTITY</th>
            <th>UPDATED BY</th>
            <th>DATE</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="historyBody">
          <tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px;">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Filter Modal -->
  <div class="overlay" id="filterOverlay">
    <div class="modal filter-modal">
      <button class="back-btn" onclick="closeFilterModal()">&lt;</button>
      <div class="modal-title">Filter Inventory</div>
      <hr>

      <div class="section" style="margin-top:14px;">
        <div class="label">CATEGORY</div>
        <select id="filterCategory" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;">
          <option value="">All categories</option>
          <option value="MUGS">MUGS</option>
          <option value="SHIRTS">SHIRTS</option>
          <option value="PAPER">PAPER</option>
          <option value="SUPPLY">SUPPLY</option>
          <option value="PEN">PEN</option>
          <option value="FANS">FANS</option>
          <option value="INK">INK (Bottles)</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>

      <div class="section" style="margin-top:12px;">
        <div class="label">STATUS</div>
        <select id="filterStatus" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;">
          <option value="">All statuses</option>
          <option value="Normal Stock">Normal Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="High Stock">High Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>

      <div class="section" style="margin-top:12px;">
        <div class="label">SORT BY NAME</div>
        <select id="filterSort" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;">
          <option value="">Default</option>
          <option value="az">A – Z</option>
          <option value="za">Z – A</option>
        </select>
      </div>

      <div class="btn-row" style="margin-top:20px;">
        <div class="btn btn-cancel" onclick="resetFilters()">RESET</div>
        <div class="btn btn-update" onclick="applyFilters()">APPLY</div>
      </div>
    </div>
  </div>

  <!-- Update Item Modal -->
  <div class="overlay" id="updateOverlay">
    <div class="modal">
      <button class="back-btn" onclick="closeModal()">&lt;</button>
      <div class="modal-title">Update Item</div>
      <hr>
      <div class="row">
        <div><div class="label">ITEM NAME:</div><div class="value" id="modalItemName">—</div></div>
        <div><div class="label">CURRENT STOCK</div><div class="value" id="modalCurrentStock">0</div></div>
      </div>
      <div class="section" style="margin-top:4px;">
        <div class="label">ITEM NAME</div>
        <input type="text" id="modalItemNameInput" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
      </div>
      <div class="section" style="margin-top:4px;">
        <div class="label">CATEGORY</div>
        <select id="modalCategory" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;" onchange="toggleModalSize(this.value, 'modalSizeRow')">
          <option value="MUGS">MUGS</option>
          <option value="SHIRTS">SHIRTS</option>
          <option value="PAPER">PAPER</option>
          <option value="SUPPLY">SUPPLY</option>
          <option value="PEN">PEN</option>
          <option value="FANS">FANS</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>
      <div class="section" id="modalSizeRow" style="margin-top:4px;display:none;">
        <div class="label">SIZE</div>
        <select id="modalSize" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;">
          <option value="">— No size —</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="2XL">2XL</option>
          <option value="3XL">3XL</option>
        </select>
      </div>
      <div class="section" style="margin-top:4px;">
        <div class="label">UNIT COST (₱)</div>
        <input type="number" id="modalUnitCost" min="0" step="0.01" placeholder="0.00" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
      </div>
      <div class="section">
        <div class="label">ADD / DEDUCT STOCK</div>
        <div class="radio-row">
          <div class="radio-option" onclick="selectStockMode('add')"><div class="radio-box filled" id="radioAddBox"></div> ADD STOCK</div>
          <div class="radio-option" onclick="selectStockMode('deduct')"><div class="radio-box" id="radioDeductBox"></div> DEDUCT STOCK</div>
        </div>
      </div>
      <div class="section stepper-row">
        <div><div class="label">QUANTITY</div>
          <div class="stepper"><button type="button" onclick="changeQuantity(-1)">-</button><div class="qty" id="modalQty">10</div><button type="button" onclick="changeQuantity(1)">+</button></div>
        </div>
        <div class="new-total"><div class="label">NEW TOTAL STOCK:</div><div class="value" id="modalNewTotal">0</div></div>
      </div>
      <div class="section"><div class="label">REMARKS</div><textarea class="remarks-box" id="modalRemarks" rows="2" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;resize:none;"></textarea></div>
      <div class="btn-row">
        <div class="btn btn-cancel" onclick="closeModal()">CANCEL</div>
        <div class="btn btn-update" onclick="submitUpdate()">UPDATE</div>
      </div>
    </div>
  </div>

  <!-- Archive Confirmation Modal -->
  <div class="overlay" id="archiveOverlay">
    <div class="archive-modal">
      <h2>ARE YOU SURE TO ARCHIVE THIS ITEM?</h2>
      <div class="archive-item-name" id="archiveItemName">—</div>
      <div class="archive-btn-row">
        <div class="archive-btn archive-btn-cancel" onclick="closeArchiveModal()">CANCEL</div>
        <div class="archive-btn archive-btn-confirm" onclick="submitArchive()">ARCHIVE</div>
      </div>
    </div>
  </div>

  <!-- Unarchive Confirmation Modal -->
  <div class="overlay" id="unarchiveOverlay">
    <div class="unarchive-modal">
      <h2>UNARCHIVE THIS ITEM?</h2>
      <div class="unarchive-item-name" id="unarchiveItemName">—</div>
      <div class="unarchive-btn-row">
        <div class="unarchive-btn unarchive-btn-cancel" onclick="closeUnarchiveModal()">CANCEL</div>
        <div class="unarchive-btn unarchive-btn-confirm" onclick="submitUnarchive()">UNARCHIVE</div>
      </div>
    </div>
  </div>

  <!-- Update Detail Modal -->
  <div class="overlay" id="detailOverlay">
    <div class="detail-modal">
      <button class="back-btn" onclick="closeUpdateDetailModal()">&lt;</button>
      <div class="modal-title">Update Detail</div>
      <hr>
      <div class="detail-row"><div><div class="detail-label">ITEM NAME:</div><div class="detail-value" id="detailItemName">—</div></div><div><div class="detail-label">STOCK BEFORE:</div><div class="detail-value" id="detailCurrentStock">0</div></div></div>
      <div class="detail-section"><div class="detail-label">ACTION</div><div class="detail-value" id="detailAction">—</div></div>
      <div class="detail-row"><div><div class="detail-label">QUANTITY</div><div class="detail-value" id="detailQuantity">0</div></div><div><div class="detail-label">NEW TOTAL STOCK:</div><div class="detail-value large" id="detailNewTotal">0</div></div></div>
      <div class="detail-section"><div class="detail-label">REMARKS</div><div class="detail-value" id="detailRemarks">—</div></div>
      <div class="detail-section"><div class="detail-label">UPDATED BY</div><div class="detail-value" id="detailUpdatedBy">—</div></div>
      <div class="detail-section"><div class="detail-label">DATE UPDATED</div><div class="detail-value" id="detailDate">—</div><div class="detail-date-small" id="detailTime">—</div></div>
    </div>
  </div>

  <!-- Add Material Modal (Owner only) -->
  <?php if ($loggedInRole === 'Owner'): ?>
  <div class="overlay" id="addMaterialOverlay">
    <div class="modal">
      <button class="back-btn" onclick="closeAddMaterialModal()">&lt;</button>
      <div class="modal-title">Add New Material</div>
      <hr>
      <div class="section" style="margin-top:16px;">
        <div class="label">ITEM NAME</div>
        <input type="text" id="addItemName" placeholder="e.g. White Mug" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
      </div>
      <div class="section" style="margin-top:12px;">
        <div class="label">CATEGORY</div>
        <select id="addCategory" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;" onchange="toggleModalSize(this.value, 'addSizeRow')">
          <option value="MUGS">MUGS</option>
          <option value="SHIRTS">SHIRTS</option>
          <option value="PAPER">PAPER</option>
          <option value="SUPPLY">SUPPLY</option>
          <option value="PEN">PEN</option>
          <option value="FANS">FANS</option>
          <option value="INK">INK (Bottles)</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>
      <div class="section" id="addSizeRow" style="margin-top:4px;display:none;">
        <div class="label">SIZE</div>
        <select id="addSize" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;">
          <option value="">— No size —</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="2XL">2XL</option>
          <option value="3XL">3XL</option>
        </select>
      </div>
      <div class="section" style="margin-top:12px;display:flex;gap:12px;">
        <div style="flex:1;">
          <div class="label">INITIAL STOCK</div>
          <input type="number" id="addStock" placeholder="0" min="0" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
        </div>
        <div style="flex:1;">
          <div class="label">UNIT</div>
          <select id="addUnit" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 10px;font-size:14px;margin-top:4px;background:#fff;">
            <option value="" disabled selected>Select unit</option>
            <option value="Pcs">Pcs</option>
            <option value="dozen">dozen</option>
            <option value="pack">pack</option>
            <option value="box">box</option>
            <option value="carton">carton</option>
            <option value="set">set</option>
            <option value="bottle">bottle</option>
          </select>
        </div>
      </div>
      <div class="section" style="margin-top:12px;display:flex;gap:12px;">
        <div style="flex:1;">
          <div class="label">REORDER LEVEL</div>
          <input type="number" id="addReorderLevel" placeholder="10" min="0" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
        </div>
        <div style="flex:1;">
          <div class="label">UNIT COST (₱)</div>
          <input type="number" id="addUnitCost" placeholder="0.00" min="0" step="0.01" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:0 12px;font-size:14px;margin-top:4px;">
        </div>
      </div>
      <div class="section" style="margin-top:12px;">
        <div class="label">DESCRIPTION (optional)</div>
        <textarea id="addDescription" rows="2" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;resize:none;font-size:14px;margin-top:4px;"></textarea>
      </div>
      <div class="btn-row" style="margin-top:20px;">
        <div class="btn btn-cancel" onclick="closeAddMaterialModal()">CANCEL</div>
        <div class="btn btn-update" onclick="submitAddMaterial()">ADD</div>
      </div>
    </div>
  </div>
  <?php endif; ?>

<script>
const API = 'inventory_api.php';
let inventoryItems = [];
let activeItemId = null;
let stockMode = 'add';
let stockQuantity = 10;
let stockCurrentStock = 0;

// ── Show/hide size row based on category ────────────────────
function toggleModalSize(category, rowId) {
  document.getElementById(rowId).style.display = category === 'SHIRTS' ? '' : 'none';
}

// ── Load data ───────────────────────────────────────────────
async function loadInventory() {
  try {
    const res = await fetch(API);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    inventoryItems = data.items;
    refreshInventoryView();
    renderHistory(data.history);
    loadArchived();
  } catch (err) {
    document.getElementById('inventoryBody').innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:24px;">${err.message}</td></tr>`;
  }
}

async function loadArchived() {
  const res = await fetch(API + '?type=archived');
  const data = await res.json();
  if (data.success) renderArchived(data.items);
}

function statusBadgeClass(status) {
  if (status === 'Normal Stock') return 'status-normal';
  if (status === 'Low Stock') return 'status-low';
  if (status === 'High Stock') return 'status-high';
  if (status === 'Out of Stock') return 'status-out';
  return '';
}

function renderInventory(items) {
  const tbody = document.getElementById('inventoryBody');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px;">No inventory items.</td></tr>'; return; }
  tbody.innerHTML = items.map(i => `
    <tr>
      <td>${i.item_name}</td>
      <td>${i.category}</td>
      <td>${i.stock}</td>
      <td>${i.unit}</td>
      <td><span class="status-badge ${statusBadgeClass(i.status)}">${i.status}</span></td>
      <td>
        <div class="action-icons">
          <button class="icon-btn" onclick="openModal(${i.id}, '${esc(i.item_name)}', ${i.stock}, '${esc(i.category)}', '${esc(i.size||'')}', ${Number(i.unit_cost) || 0})">&#9998;</button>
          <button class="icon-btn" onclick="openArchiveModal(${i.id}, '${esc(i.item_name)}')">&#128451;</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderArchived(items) {
  const tbody = document.getElementById('archiveBody');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px;">No archived items.</td></tr>'; return; }
  tbody.innerHTML = items.map(i => `
    <tr>
      <td>${i.item_name}</td>
      <td>${i.category}</td>
      <td>${i.unit}</td>
      <td>${i.updated_at || '—'}</td>
      <td class="history-arrow" style="cursor:pointer;" onclick="openUnarchiveModal(${i.id}, '${esc(i.item_name)}')">&gt;</td>
    </tr>
  `).join('');
}

function renderHistory(history) {
  const tbody = document.getElementById('historyBody');
  if (!history.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px;">No update history.</td></tr>'; return; }
  tbody.innerHTML = history.map(h => `
    <tr>
      <td>${h.item_name}</td>
      <td>${h.action}</td>
      <td>${h.quantity}</td>
      <td>${h.updated_by_name || '—'}</td>
      <td>${h.date_formatted}</td>
      <td class="history-arrow" style="cursor:pointer;" onclick="openUpdateDetailModal('${esc(h.item_name)}','${h.stock_before}','${h.action}','${h.quantity}','${h.stock_after}','${esc(h.reason||'')}','${esc(h.updated_by_name||'')}','${h.date_formatted}','${h.time_formatted}')">&gt;</td>
    </tr>
  `).join('');
}

function esc(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ── Search + Filter ─────────────────────────────────────────
let currentFilters = { category: '', status: '', sort: '' };

function getVisibleInventory() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  let list = inventoryItems.filter(i =>
    i.item_name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
  );

  if (currentFilters.category) {
    list = list.filter(i => i.category === currentFilters.category);
  }
  if (currentFilters.status) {
    list = list.filter(i => i.status === currentFilters.status);
  }
  if (currentFilters.sort === 'az') {
    list = list.slice().sort((a, b) => a.item_name.localeCompare(b.item_name));
  } else if (currentFilters.sort === 'za') {
    list = list.slice().sort((a, b) => b.item_name.localeCompare(a.item_name));
  }
  return list;
}

const INVENTORY_DISPLAY_LIMIT = 20;
let showingAllInventory = false;

function refreshInventoryView() {
  const list = getVisibleInventory();
  const visible = showingAllInventory ? list : list.slice(0, INVENTORY_DISPLAY_LIMIT);
  renderInventory(visible);

  // Show the toggle button whenever the current result set exceeds the limit.
  // Label it "See All" when collapsed and "Show Less" when expanded.
  const wrap = document.getElementById('invSeeAllWrap');
  const btn = document.getElementById('invSeeAllBtn');
  if (wrap && btn) {
    if (list.length > INVENTORY_DISPLAY_LIMIT) {
      wrap.style.display = '';
      btn.textContent = showingAllInventory ? 'Show Less' : `See All Items (${list.length})`;
    } else {
      wrap.style.display = 'none';
    }
  }
}

document.getElementById('searchInput').addEventListener('input', function() {
  showingAllInventory = false;
  refreshInventoryView();
});

// Toggle between all items and the limited view when the button is clicked.
const invSeeAllBtn = document.getElementById('invSeeAllBtn');
if (invSeeAllBtn) {
  invSeeAllBtn.addEventListener('click', function() {
    showingAllInventory = !showingAllInventory;
    refreshInventoryView();
  });
}

// ── Filter Modal ────────────────────────────────────────────
function openFilterModal() {
  document.getElementById('filterCategory').value = currentFilters.category;
  document.getElementById('filterStatus').value = currentFilters.status;
  document.getElementById('filterSort').value = currentFilters.sort;
  document.getElementById('filterOverlay').classList.add('show');
}
function closeFilterModal() { document.getElementById('filterOverlay').classList.remove('show'); }
function applyFilters() {
  currentFilters.category = document.getElementById('filterCategory').value;
  currentFilters.status = document.getElementById('filterStatus').value;
  currentFilters.sort = document.getElementById('filterSort').value;
  showingAllInventory = false;
  refreshInventoryView();
  closeFilterModal();
}
function resetFilters() {
  currentFilters = { category: '', status: '', sort: '' };
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterSort').value = '';
  showingAllInventory = false;
  refreshInventoryView();
  closeFilterModal();
}

const filterLink = document.getElementById('filterLink');
if (filterLink) filterLink.addEventListener('click', openFilterModal);

// ── Update Modal ────────────────────────────────────────────
function openModal(id, itemName, currentStock, currentCategory, currentSize, currentUnitCost) {
  activeItemId = id;
  document.getElementById('modalItemName').textContent = itemName;
  document.getElementById('modalItemNameInput').value = itemName;
  document.getElementById('modalCurrentStock').textContent = currentStock;
  stockCurrentStock = currentStock;
  stockQuantity = 10;
  document.getElementById('modalQty').textContent = stockQuantity;
  document.getElementById('modalRemarks').value = '';
  document.getElementById('modalCategory').value = currentCategory || 'OTHER';
  toggleModalSize(currentCategory || 'OTHER', 'modalSizeRow');
  document.getElementById('modalSize').value = currentSize || '';
  document.getElementById('modalUnitCost').value = (currentUnitCost != null ? Number(currentUnitCost) : 0).toFixed(2);
  selectStockMode('add');
  document.getElementById('updateOverlay').classList.add('show');
}

function selectStockMode(mode) {
  stockMode = mode;
  document.getElementById('radioAddBox').classList.toggle('filled', mode === 'add');
  document.getElementById('radioDeductBox').classList.toggle('filled', mode === 'deduct');
  updateNewTotal();
}

function changeQuantity(delta) {
  stockQuantity = Math.max(0, stockQuantity + delta);
  document.getElementById('modalQty').textContent = stockQuantity;
  updateNewTotal();
}

function updateNewTotal() {
  const t = stockMode === 'add' ? stockCurrentStock + stockQuantity : Math.max(0, stockCurrentStock - stockQuantity);
  document.getElementById('modalNewTotal').textContent = t;
}

function closeModal() { document.getElementById('updateOverlay').classList.remove('show'); }

async function submitUpdate() {
  const category = document.getElementById('modalCategory').value;
  const size = category === 'SHIRTS' ? (document.getElementById('modalSize').value || null) : null;
  const itemName = document.getElementById('modalItemNameInput').value.trim();
  const unitCost = Math.max(0, parseFloat(document.getElementById('modalUnitCost').value) || 0);

  if (!itemName) { alert('Item name is required.'); return; }

  // Update name + category + size + unit cost
  const itemRes = await fetch(API, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action: 'update_item', id: activeItemId, item_name: itemName, category, size, unit_cost: unitCost })
  });
  const itemData = await itemRes.json();
  if (!itemData.success) { alert(itemData.error); return; }

  // Update stock only when a quantity change was entered.
  if (stockQuantity > 0) {
    const res = await fetch(API, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_stock', id: activeItemId, mode: stockMode, quantity: stockQuantity, remarks: document.getElementById('modalRemarks').value.trim() })
    });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
  }

  closeModal();
  loadInventory();
}

// ── Archive Modal ───────────────────────────────────────────
let archiveItemId = null;
function openArchiveModal(id, name) { archiveItemId = id; document.getElementById('archiveItemName').textContent = name; document.getElementById('archiveOverlay').classList.add('show'); }
function closeArchiveModal() { document.getElementById('archiveOverlay').classList.remove('show'); }
async function submitArchive() {
  const res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'archive', id: archiveItemId}) });
  const data = await res.json();
  if (data.success) { closeArchiveModal(); loadInventory(); } else { alert(data.error); }
}

// ── Unarchive Modal ─────────────────────────────────────────
let unarchiveItemId = null;
function openUnarchiveModal(id, name) { unarchiveItemId = id; document.getElementById('unarchiveItemName').textContent = name; document.getElementById('unarchiveOverlay').classList.add('show'); }
function closeUnarchiveModal() { document.getElementById('unarchiveOverlay').classList.remove('show'); }
async function submitUnarchive() {
  const res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'unarchive', id: unarchiveItemId}) });
  const data = await res.json();
  if (data.success) { closeUnarchiveModal(); loadInventory(); } else { alert(data.error); }
}

// ── Detail Modal ────────────────────────────────────────────
function openUpdateDetailModal(itemName, stockBefore, action, quantity, stockAfter, remarks, updatedBy, date, time) {
  document.getElementById('detailItemName').textContent = itemName;
  document.getElementById('detailCurrentStock').textContent = stockBefore;
  document.getElementById('detailAction').textContent = action;
  document.getElementById('detailQuantity').textContent = quantity;
  document.getElementById('detailNewTotal').textContent = stockAfter;
  document.getElementById('detailRemarks').textContent = remarks || '—';
  document.getElementById('detailUpdatedBy').textContent = updatedBy || '—';
  document.getElementById('detailDate').textContent = date;
  document.getElementById('detailTime').textContent = time;
  document.getElementById('detailOverlay').classList.add('show');
}
function closeUpdateDetailModal() { document.getElementById('detailOverlay').classList.remove('show'); }

// ── Logout dropdown ─────────────────────────────────────────
const ownerTag = document.getElementById('ownerTag');
ownerTag.addEventListener('click', function(e) { e.stopPropagation(); this.classList.toggle('open'); });
document.addEventListener('click', function() { ownerTag.classList.remove('open'); });
document.getElementById('logoutBtn').addEventListener('click', function(e) {
  e.preventDefault();
  if (confirm('Are you sure you want to log out?')) {
    window.location.href = '../Registration/logout.php';
  }
});

// ── Back-button protection ──────────────────────────────────
window.addEventListener('pageshow', function(e) { if (e.persisted) window.location.reload(); });

// ── Add Material Modal (Owner only) ─────────────────────────
function openAddMaterialModal() {
  document.getElementById('addItemName').value = '';
  document.getElementById('addCategory').value = 'MUGS';
  toggleModalSize('MUGS', 'addSizeRow');
  document.getElementById('addSize').value = '';
  document.getElementById('addStock').value = '';
  document.getElementById('addUnit').value = '';
  document.getElementById('addReorderLevel').value = '';
  document.getElementById('addUnitCost').value = '';
  document.getElementById('addDescription').value = '';
  document.getElementById('addMaterialOverlay').classList.add('show');
}
function closeAddMaterialModal() { document.getElementById('addMaterialOverlay').classList.remove('show'); }

async function submitAddMaterial() {
  const itemName = document.getElementById('addItemName').value.trim();
  const category = document.getElementById('addCategory').value;
  const size = category === 'SHIRTS' ? (document.getElementById('addSize').value || null) : null;
  const stock = parseInt(document.getElementById('addStock').value) || 0;
  const unit = document.getElementById('addUnit').value.trim();
  const reorderLevel = parseInt(document.getElementById('addReorderLevel').value) || 10;
  const unitCost = parseFloat(document.getElementById('addUnitCost').value) || 0;
  const description = document.getElementById('addDescription').value.trim();

  if (!itemName || !unit) { alert('Item name and unit are required.'); return; }

  const res = await fetch(API, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action:'add_material', item_name: itemName, category, size, stock, unit, reorder_level: reorderLevel, unit_cost: unitCost, description })
  });
  const data = await res.json();
  if (data.success) { closeAddMaterialModal(); loadInventory(); } else { alert(data.error); }
}

// Attach add material button
const addMaterialBtn = document.getElementById('addMaterialBtn');
if (addMaterialBtn) { addMaterialBtn.addEventListener('click', openAddMaterialModal); }

// ── Init ────────────────────────────────────────────────────
loadInventory();
</script>
</body>
</html>
