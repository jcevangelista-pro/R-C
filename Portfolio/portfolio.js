/* =========================================================
   R&C Printing Services — script.js
   Adds: search filter, cart panel, image lightbox,
   smooth nav scrolling, user dropdown.
   No HTML changes required — just add before </body>:
   <script src="script.js" defer></script>
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  const nav = document.querySelector('.Navbar');
  const navIcons = nav.querySelectorAll('ul > li > a');
  // Based on the markup order: [0] search, [1] typing/edit, [2] trolley,
  // [3] HOME, [4] PRODUCTS, [5] PORTFOLIO, [6] user
  const searchIconLink = navIcons[0];
  const cartIconLink   = navIcons[2];
  const userIconLink   = navIcons[6];
  const homeLink       = navIcons[3];
  const productsLink   = navIcons[4];
  const portfolioLink  = navIcons[5];

  /* ---------------------------------------------------------
     1. SEARCH BAR
  --------------------------------------------------------- */
  const searchBar = document.createElement('div');
  searchBar.className = 'SearchBar';
  searchBar.style.display = 'none';
  searchBar.innerHTML = `<input type="text" placeholder="Search products..." class="SearchInput">`;
  nav.appendChild(searchBar);

  const searchInput = searchBar.querySelector('.SearchInput');

  searchIconLink.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = searchBar.style.display === 'block';
    searchBar.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) searchInput.focus();
  });

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('.ProductCard').forEach(card => {
      const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(term) ? '' : 'none';
    });
  });

  /* ---------------------------------------------------------
     2. CART PANEL + ADD TO CART BUTTONS
  --------------------------------------------------------- */
  const cartBadge = document.createElement('span');
  cartBadge.className = 'CartBadge';
  cartBadge.textContent = '0';
  cartIconLink.style.position = 'relative';
  cartIconLink.appendChild(cartBadge);

  const cartPanel = document.createElement('div');
  cartPanel.className = 'CartPanel';
  cartPanel.innerHTML = `
    <div class="CartPanelHeader">
      <h3>Your Cart</h3>
      <button class="CartCloseBtn" aria-label="Close cart">&times;</button>
    </div>
    <ul class="CartItems"></ul>
    <p class="CartEmptyMsg">Your cart is empty.</p>
  `;
  document.body.appendChild(cartPanel);

  const cartItemsList = cartPanel.querySelector('.CartItems');
  const cartEmptyMsg = cartPanel.querySelector('.CartEmptyMsg');
  const cart = {}; // { productName: quantity }

  function renderCart() {
    const names = Object.keys(cart);
    cartItemsList.innerHTML = '';
    cartEmptyMsg.style.display = names.length ? 'none' : 'block';

    names.forEach(name => {
      const li = document.createElement('li');
      li.className = 'CartItem';
      li.innerHTML = `
        <span class="CartItemName">${name}</span>
        <span class="CartItemQty">x${cart[name]}</span>
        <button class="CartItemRemove" data-name="${name}" aria-label="Remove item">&times;</button>
      `;
      cartItemsList.appendChild(li);
    });

    const totalCount = names.reduce((sum, n) => sum + cart[n], 0);
    cartBadge.textContent = totalCount;
  }

  cartItemsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('CartItemRemove')) {
      const name = e.target.dataset.name;
      delete cart[name];
      renderCart();
    }
  });

  cartIconLink.addEventListener('click', (e) => {
    e.preventDefault();
    cartPanel.classList.toggle('OpenCart');
  });

  cartPanel.querySelector('.CartCloseBtn').addEventListener('click', () => {
    cartPanel.classList.remove('OpenCart');
  });

  // Add an "Add to Cart" button under every product card
  document.querySelectorAll('.ProductCard').forEach(card => {
    const name = card.querySelector('h3')?.textContent.trim() || 'Item';
    const btn = document.createElement('button');
    btn.className = 'AddToCartBtn';
    btn.textContent = 'Add to Cart';
    btn.addEventListener('click', () => {
      cart[name] = (cart[name] || 0) + 1;
      renderCart();
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = 'Add to Cart'), 900);
    });
    card.appendChild(btn);
  });

  /* ---------------------------------------------------------
     3. USER DROPDOWN
  --------------------------------------------------------- */
  const userDropdown = document.createElement('div');
  userDropdown.className = 'UserDropdown';
  userDropdown.style.display = 'none';
  userDropdown.innerHTML = `
    <a href="#">Log In</a>
    <a href="#">Sign Up</a>
  `;
  userIconLink.style.position = 'relative';
  userIconLink.appendChild(userDropdown);

  userIconLink.addEventListener('click', (e) => {
    e.preventDefault();
    userDropdown.style.display =
      userDropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Close cart/search/dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      searchBar.style.display = 'none';
      userDropdown.style.display = 'none';
    }
    if (!cartPanel.contains(e.target) && !cartIconLink.contains(e.target)) {
      cartPanel.classList.remove('OpenCart');
    }
  });

  /* ---------------------------------------------------------
     4. SMOOTH NAV SCROLLING
  --------------------------------------------------------- */
  function scrollToHeading(text) {
    const heading = Array.from(document.querySelectorAll('h2'))
      .find(h => h.textContent.trim().toUpperCase() === text);
    if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  productsLink.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToHeading('SUBLIMATIONS');
  });

  portfolioLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.SocialsBox')?.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------------------------------------------------
     5. IMAGE LIGHTBOX
  --------------------------------------------------------- */
  const lightbox = document.createElement('div');
  lightbox.className = 'Lightbox';
  lightbox.style.display = 'none';
  lightbox.innerHTML = `
    <span class="LightboxClose" aria-label="Close">&times;</span>
    <img class="LightboxImg" src="" alt="">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.LightboxImg');

  document.querySelectorAll('.ProductImage').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.style.display = 'flex';
    });
  });

  lightbox.addEventListener('click', () => {
    lightbox.style.display = 'none';
  });

});