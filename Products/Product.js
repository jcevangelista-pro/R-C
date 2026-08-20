// ── Read URL params and populate product details ────────────
const params = new URLSearchParams(window.location.search);

const productName = params.get('name');
const productType = params.get('type');
const productPrice = params.get('price');
const productImg = params.get('img');
const productId = params.get('id');

// Determine the correct image path
function resolveImgPath(img) {
    if (!img) return '';
    if (img.startsWith('uploads/')) return img;
    if (img.startsWith('../') || img.startsWith('http')) return img;
    return '../imgs/' + img;
}

if (productName) {
    document.getElementById('ProductName').textContent = productName;
    document.getElementById('ProductType').textContent = productType || '';
    document.getElementById('ProductPrice').textContent = productPrice || '';

    const mainImg = document.querySelector('.RContainer .ProductImage');
    if (mainImg && productImg) {
        mainImg.src = resolveImgPath(productImg);
        mainImg.alt = productName;
    }

    const modalName = document.querySelector('.modal-card .product-name');
    const modalType = document.querySelector('.modal-card .product-type');
    const modalPrice = document.querySelector('.modal-card .product-price');
    const modalImg = document.querySelector('.modal-card .ProductImage');

    if (modalName) modalName.textContent = productName;
    if (modalType) modalType.textContent = productType || '';
    if (modalPrice) modalPrice.textContent = productPrice || '';
    if (modalImg && productImg) {
        modalImg.src = resolveImgPath(productImg);
        modalImg.alt = productName;
    }
}

// ── Quantity stepper ────────────────────────────────────────
let modalQty = 1;
const qtyDisplay = document.getElementById('modalQtyDisplay');
const minusBtn = document.getElementById('modalMinusBtn');
const plusBtn = document.getElementById('modalPlusBtn');

if (qtyDisplay) qtyDisplay.textContent = modalQty;

if (minusBtn) {
    minusBtn.addEventListener('click', () => {
        if (modalQty > 1) {
            modalQty--;
            qtyDisplay.textContent = modalQty;
        }
    });
}

if (plusBtn) {
    plusBtn.addEventListener('click', () => {
        modalQty++;
        qtyDisplay.textContent = modalQty;
    });
}

// ── Add to Cart (modal button) ──────────────────────────────
const addToCartBtn = document.querySelector('.modal-card .btn-add-cart');
if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async () => {
        if (!productId) {
            alert('Product info missing. Please go back and select a product.');
            return;
        }

        try {
            const res = await fetch('../CART/cart_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    product_id: parseInt(productId),
                    quantity: modalQty
                })
            });
            const data = await res.json();

            if (data.success) {
                addToCartBtn.textContent = 'Added to Cart ✓';
                setTimeout(() => { addToCartBtn.textContent = 'Add to Cart'; }, 2000);
            } else {
                alert(data.error || 'Failed to add to cart.');
            }
        } catch (err) {
            alert('Error adding to cart. Please make sure you are logged in.');
        }
    });
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
