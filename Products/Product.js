// ── Read URL params and populate product details ────────────
const params = new URLSearchParams(window.location.search);

const productName = params.get('name');
const productType = params.get('type');
const productPrice = params.get('price');
const productImg = params.get('img');

if (productName) {
    // Main page elements
    document.getElementById('ProductName').textContent = productName;
    document.getElementById('ProductType').textContent = productType || '';
    document.getElementById('ProductPrice').textContent = productPrice || '';

    // Product image
    const mainImg = document.querySelector('.RContainer .ProductImage');
    if (mainImg && productImg) {
        mainImg.src = '../imgs/' + productImg;
        mainImg.alt = productName;
    }

    // Modal elements
    const modalName = document.querySelector('.modal-card .product-name');
    const modalType = document.querySelector('.modal-card .product-type');
    const modalPrice = document.querySelector('.modal-card .product-price');
    const modalImg = document.querySelector('.modal-card .ProductImage');

    if (modalName) modalName.textContent = productName;
    if (modalType) modalType.textContent = productType || '';
    if (modalPrice) modalPrice.textContent = productPrice || '';
    if (modalImg && productImg) {
        modalImg.src = '../imgs/' + productImg;
        modalImg.alt = productName;
    }
}

// ── Back button → navigate to LandingPage ───────────────────
const BackButton = document.getElementById('BackButton');
BackButton.addEventListener('click', () => {
    window.location.href = '../LandingPage/LandingPage.html';
});

// ── Modal open/close ────────────────────────────────────────
const OpenModal = document.getElementById('OpenModal');
const ModalContainer = document.getElementById('Modal_Container');
const MBackButton = document.getElementById('MBackButton');

OpenModal.addEventListener('click', () => {
    ModalContainer.classList.add('show');
});

MBackButton.addEventListener('click', () => {
    ModalContainer.classList.remove('show');
});
