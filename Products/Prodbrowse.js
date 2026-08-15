/* =========================================================
   R&C Printing Services — ProductsPage.js
   Handles: category/type/price filtering, sorting, search,
   and a working "Add to Cart" panel.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------
     0. PRODUCT DATA
     Replace image paths / prices / names with your real catalog.
  --------------------------------------------------------- */
  const PRODUCTS = [
    { id: 'p01', name: 'Classic Singlet',        category: 'Sublimations',        type: 'Singlet',       price: 250, image: '../imgs/MugPicture.jpg' },
    { id: 'p02', name: 'Car Sunshade',            category: 'Sublimations',        type: 'Car Sunshade',  price: 180, image: '../imgs/MugPicture.jpg' },
    { id: 'p03', name: 'Sublimation Pillow Case', category: 'Sublimations',        type: 'Pillow Case',   price: 220, image: '../imgs/MugPicture.jpg' },
    { id: 'p04', name: 'Sublimation Apron',       category: 'Sublimations',        type: 'Apron',         price: 200, image: '../imgs/MugPicture.jpg' },
    { id: 'p05', name: 'Ceramic Mug 11oz',        category: 'Mugs & Tumbler',      type: 'Mug',           price: 150, image: '../imgs/MugPicture.jpg' },
    { id: 'p06', name: 'Stainless Tumbler 500ml', category: 'Mugs & Tumbler',      type: 'Tumbler',       price: 320, image: '../imgs/MugPicture.jpg' },
    { id: 'p07', name: 'Water Bottle 750ml',      category: 'Mugs & Tumbler',      type: 'Water Bottle',  price: 280, image: '../imgs/MugPicture.jpg' },
    { id: 'p08', name: 'Travel Mug',              category: 'Mugs & Tumbler',      type: 'Travel Mug',    price: 260, image: '../imgs/MugPicture.jpg' },
    { id: 'p09', name: 'Custom Sticker Sheet',    category: 'Office Requirements', type: 'Sticker',       price: 90,  image: '../imgs/MugPicture.jpg' },
    { id: 'p10', name: 'ID Lace',                 category: 'Office Requirements', type: 'ID Lace',       price: 60,  image: '../imgs/MugPicture.jpg' },
    { id: 'p11', name: 'Folder with Print',       category: 'Office Requirements', type: 'Folder',        price: 75,  image: '../imgs/MugPicture.jpg' },
    { id: 'p12', name: 'Calling Card (100pcs)',   category: 'Office Requirements', type: 'Calling Card',  price: 180, image: '../imgs/MugPicture.jpg' },
  ];

  /* ---------------------------------------------------------
     1. STATE
  --------------------------------------------------------- */
  const state = {
    category: 'all',
    types: new Set(),
    minPrice: null,
    maxPrice: null,
    searchTerm: '',
    sort: 'default',
  };

  /* ---------------------------------------------------------
     2. ELEMENT REFS
  --------------------------------------------------------- */
  const grid          = document.getElementById('ProductGrid');
  const resultsCount   = document.getElementById('ResultsCount');
  const noResultsMsg   = document.getElementById('NoResultsMsg');
  const categoryList   = document.getElementById('CategoryList');
  const typeList       = document.getElementById('TypeList');
  const minPriceInput  = document.getElementById('MinPrice');
  const maxPriceInput  = document.getElementById('MaxPrice');
  const clearFiltersBtn = document.getElementById('ClearFiltersBtn');
  const sortSelect     = document.getElementById('SortSelect');

  const nav = document.querySelector('.Navbar');
  const navSearch = document.getElementById('NavSearch');
  const navChat   = document.getElementById('NavChat');
  const navCart   = document.getElementById('NavCart');
  const navUser   = document.getElementById('NavUser');

  /* ---------------------------------------------------------
     3. BUILD "FILTER BY TYPE" CHECKBOXES
  --------------------------------------------------------- */
  function renderTypeCheckboxes() {
    const relevant = state.category === 'all'
      ? PRODUCTS
      : PRODUCTS.filter(p => p.category === state.category);

    const uniqueTypes = [...new Set(relevant.map(p => p.type))];

    // Drop selected types that no longer apply to this category
    [...state.types].forEach(t => {
      if (!uniqueTypes.includes(t)) state.types.delete(t);
    });

    typeList.innerHTML = uniqueTypes.map(type => `
      <li>
        <label class="TypeCheckbox">
          <input type="checkbox" value="${type}" ${state.types.has(type) ? 'checked' : ''}>
          ${type}
        </label>
      </li>
    `).join('');

    typeList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.checked ? state.types.add(cb.value) : state.types.delete(cb.value);
        applyFilters();
      });
    });
  }

  /* ---------------------------------------------------------
     4. CATEGORY BUTTONS
  --------------------------------------------------------- */
  categoryList.addEventListener('click', (e) => {
    const btn = e.target.closest('.CategoryBtn');
    if (!btn) return;

    categoryList.querySelectorAll('.CategoryBtn').forEach(b => b.classList.remove('ActiveCategory'));
    btn.classList.add('ActiveCategory');

    state.category = btn.dataset.category;
    renderTypeCheckboxes();
    applyFilters();
  });

  /* ---------------------------------------------------------
     5. PRICE FILTER
  --------------------------------------------------------- */
  minPriceInput.addEventListener('input', () => {
    state.minPrice = minPriceInput.value ? Number(minPriceInput.value) : null;
    applyFilters();
  });

  maxPriceInput.addEventListener('input', () => {
    state.maxPrice = maxPriceInput.value ? Number(maxPriceInput.value) : null;
    applyFilters();
  });

  /* ---------------------------------------------------------
     6. SORT
  --------------------------------------------------------- */
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    applyFilters();
  });

  /* ---------------------------------------------------------
     7. CLEAR FILTERS
  --------------------------------------------------------- */
  clearFiltersBtn.addEventListener('click', () => {
    state.category = 'all';
    state.types.clear();
    state.minPrice = null;
    state.maxPrice = null;
    state.searchTerm = '';
    state.sort = 'default';

    categoryList.querySelectorAll('.CategoryBtn').forEach(b => b.classList.remove('ActiveCategory'));
    categoryList.querySelector('[data-category="all"]').classList.add('ActiveCategory');
    minPriceInput.value = '';
    maxPriceInput.value = '';
    sortSelect.value = 'default';
    if (searchInput) searchInput.value = '';

    renderTypeCheckboxes();
    applyFilters();
  });

  /* ---------------------------------------------------------
     8. FILTER + SORT + RENDER PIPELINE
  --------------------------------------------------------- */
  function applyFilters() {
    let results = PRODUCTS.filter(p => {
      if (state.category !== 'all' && p.category !== state.category) return false;
      if (state.types.size > 0 && !state.types.has(p.type)) return false;
      if (state.minPrice !== null && p.price < state.minPrice) return false;
      if (state.maxPrice !== null && p.price > state.maxPrice) return false;
      if (state.searchTerm && !p.name.toLowerCase().includes(state.searchTerm)) return false;
      return true;
    });

    switch (state.sort) {
      case 'price-asc':  results.sort((a, b) => a.price - b.price); break;
      case 'price-desc': results.sort((a, b) => b.price - a.price); break;
      case 'name-asc':   results.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    renderGrid(results);
  }

  function renderGrid(products) {
    resultsCount.textContent = products.length === PRODUCTS.length
      ? 'Showing all products'
      : `Showing ${products.length} of ${PRODUCTS.length} products`;

    noResultsMsg.style.display = products.length ? 'none' : 'block';

    grid.innerHTML = products.map(p => `
      <div class="ProductCard" data-id="${p.id}">
        <div class="ProductImageWrap">
          <span class="CategoryTag">${p.type}</span>
          <img src="${p.image}" alt="${p.name}" class="ProductImage">
        </div>
        <div class="ProductInfo">
          <h3>${p.name}</h3>
          <span class="ProductPrice">₱${p.price.toFixed(2)}</span>
          <button class="AddToCartBtn" data-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.AddToCartBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        addToCart(btn.dataset.id);
        btn.textContent = 'Added ✓';
        setTimeout(() => (btn.textContent = 'Add to Cart'), 900);
      });
    });
  }

  /* ---------------------------------------------------------
     9. SEARCH BAR (injected into navbar)
  --------------------------------------------------------- */
  const searchBar = document.createElement('div');
  searchBar.className = 'SearchBar';
  searchBar.style.display = 'none';
  searchBar.innerHTML = `<input type="text" placeholder="Search products..." class="SearchInput">`;
  nav.appendChild(searchBar);
  const searchInput = searchBar.querySelector('.SearchInput');

  navSearch.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllNavWidgets(searchBar);
    const isOpen = searchBar.style.display === 'block';
    searchBar.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) searchInput.focus();
  });

  searchInput.addEventListener('input', () => {
    state.searchTerm = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  /* ---------------------------------------------------------
     10. CHAT ICON (placeholder tooltip)
  --------------------------------------------------------- */
  const chatTooltip = document.createElement('div');
  chatTooltip.className = 'ChatTooltip';
  chatTooltip.style.display = 'none';
  chatTooltip.textContent = 'Live chat is coming soon — message us on Facebook or Viber for now!';
  nav.appendChild(chatTooltip);

  navChat.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllNavWidgets(chatTooltip);
    chatTooltip.style.display = chatTooltip.style.display === 'block' ? 'none' : 'block';
  });

  /* ---------------------------------------------------------
     11. USER DROPDOWN
  --------------------------------------------------------- */
  const userDropdown = document.createElement('div');
  userDropdown.className = 'UserDropdown';
  userDropdown.style.display = 'none';
  userDropdown.innerHTML = `
    <a href="LogInPage.html">Log In</a>
    <a href="SignUpPage.html">Sign Up</a>
  `;
  nav.appendChild(userDropdown);

  navUser.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllNavWidgets(userDropdown);
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });

  function closeAllNavWidgets(except) {
    [searchBar, chatTooltip, userDropdown].forEach(el => {
      if (el !== except) el.style.display = 'none';
    });
  }

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      searchBar.style.display = 'none';
      chatTooltip.style.display = 'none';
      userDropdown.style.display = 'none';
    }
  });

  /* ---------------------------------------------------------
     12. CART PANEL
  --------------------------------------------------------- */
  const cartBadge = document.createElement('span');
  cartBadge.className = 'CartBadge';
  cartBadge.textContent = '0';
  navCart.style.position = 'relative';
  navCart.appendChild(cartBadge);

  const cartOverlay = document.createElement('div');
  cartOverlay.className = 'CartOverlay';
  document.body.appendChild(cartOverlay);

  const cartPanel = document.createElement('div');
  cartPanel.className = 'CartPanel';
  cartPanel.innerHTML = `
    <div class="CartPanelHeader">
      <h3>Your Cart</h3>
      <button class="CartCloseBtn" aria-label="Close cart">&times;</button>
    </div>
    <ul class="CartItems"></ul>
    <p class="CartEmptyMsg">Your cart is empty.</p>
    <div class="CartFooter" style="display:none;">
      <div class="CartTotalRow">
        <span>Total</span>
        <span class="CartTotalValue">₱0.00</span>
      </div>
      <button class="CheckoutBtn">Checkout</button>
    </div>
  `;
  document.body.appendChild(cartPanel);

  const cartItemsList  = cartPanel.querySelector('.CartItems');
  const cartEmptyMsg   = cartPanel.querySelector('.CartEmptyMsg');
  const cartFooter     = cartPanel.querySelector('.CartFooter');
  const cartTotalValue = cartPanel.querySelector('.CartTotalValue');

  // Load cart from localStorage so it survives page reloads / other pages
  let cart = JSON.parse(localStorage.getItem('rc_cart') || '{}'); // { productId: qty }

  function saveCart() {
    localStorage.setItem('rc_cart', JSON.stringify(cart));
  }

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
  }

  function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    delete cart[id];
    saveCart();
    renderCart();
  }

  function renderCart() {
    const ids = Object.keys(cart);
    cartItemsList.innerHTML = '';
    cartEmptyMsg.style.display = ids.length ? 'none' : 'block';
    cartFooter.style.display = ids.length ? 'block' : 'none';

    let total = 0;
    let totalQty = 0;

    ids.forEach(id => {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;
      const qty = cart[id];
      total += product.price * qty;
      totalQty += qty;

      const li = document.createElement('li');
      li.className = 'CartItem';
      li.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="CartItemImg">
        <div class="CartItemDetails">
          <span class="CartItemName">${product.name}</span>
          <span class="CartItemPrice">₱${product.price.toFixed(2)}</span>
          <div class="QtyControls">
            <button class="QtyBtn" data-action="decrease" data-id="${id}">−</button>
            <span>${qty}</span>
            <button class="QtyBtn" data-action="increase" data-id="${id}">+</button>
          </div>
        </div>
        <button class="CartItemRemove" data-id="${id}" aria-label="Remove item">&times;</button>
      `;
      cartItemsList.appendChild(li);
    });

    cartTotalValue.textContent = `₱${total.toFixed(2)}`;
    cartBadge.textContent = totalQty;
  }

  cartItemsList.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('CartItemRemove')) {
      removeFromCart(id);
    } else if (e.target.dataset.action === 'increase') {
      changeQty(id, 1);
    } else if (e.target.dataset.action === 'decrease') {
      changeQty(id, -1);
    }
  });

  function openCart() {
    cartPanel.classList.add('OpenCart');
    cartOverlay.classList.add('ShowOverlay');
  }

  function closeCart() {
    cartPanel.classList.remove('OpenCart');
    cartOverlay.classList.remove('ShowOverlay');
  }

  navCart.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllNavWidgets(null);
    openCart();
  });

  cartPanel.querySelector('.CartCloseBtn').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  cartPanel.querySelector('.CheckoutBtn').addEventListener('click', () => {
    alert('Checkout isn\'t wired up to a payment system yet — connect this button to your backend/payment provider when ready.');
  });

  /* ---------------------------------------------------------
     13. INITIAL RENDER
  --------------------------------------------------------- */
  renderTypeCheckboxes();
  applyFilters();
  renderCart();

});