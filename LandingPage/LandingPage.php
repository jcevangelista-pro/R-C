<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>R&C Printing Services</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="LandingPage.css">
    <link rel="stylesheet" href="../CustomerNav.css">
</head>

<body>

    <!--Navigation Bar-->
    <nav class="Navbar">
            <a href="LandingPage.php" id="BName">R&C PRINTING SERVICES</a>
        <ul>
            <li><a href=""><img src="../imgs/search.png" alt="" class="Img"></a></li>
            <!-- <li><a href=""><img src="../imgs/typing.png" alt="" class="Img"></a></li> -->
            <li><a href=""><img src="../OrderProcess/OrderProcessImgs/Alarm.png" alt="" class="Img"></a></li>
            <li><a href="../CART/cart.html"><img src="../imgs/trolley.png" alt="" class="Img"></a></li>
            <li><a href="../MyOrders/Myorder.html"><img src="../OrderProcess/OrderProcessImgs/billing.png" alt="" class="Img"></a></li>
            <li><a href="LandingPage.php" class="ActiveLink">HOME</a></li>
            <li><a href="../Products/Prodbrowse.html">PRODUCTS</a></li>
            <li><a href="../Portfolio/PortfolioPage.html">PORTFOLIO</a></li>
            <li class="user-menu-item">
                <a href="" id="NavUser"><img src="../imgs/user.png" alt="" class="Img"></a>
                <div class="user-dropdown" id="userDropdown">
                    <a href="../Profile/Profilepage.html">Profile</a>
                    <a href="../Registration/logout.php" class="logout-link">Log Out</a>
                </div>
            </li>
        </ul>
    </nav>

    <!--Welcoming Statement-->
    <div class="RContainer">
        <div class="WSContainer">
            <div class="TextContainer">
                <p class="Statement">YOUR VISION,
                    WE DELIVER
                <p>
                <p>We provide reliable and professional printing services focused on
                    supporting businesses with high-quality marketing materials,
                    branded products, and custom print solutions while also serving
                    personal and academic needs.
                </p>
            </div>
            <div>
                <div class="PicContainer">
                    <div class="PC1">
                        <img src="../imgs/MugPicture.jpg" alt="" class="Pictures" id="Picture1">
                        <img src="../imgs/MugPicture.jpg" alt="" class="Pictures" id="Picture2">
                    </div>
                        <img src="../imgs/MugPicture.jpg" alt="" class="Pictures" id="Picture3">
                </div>
            </div>
        </div>
    </div>
    <!--Product Container-->
    <div class="PContainer">
        <div>

            <div class="BSProducts">
                <h4>BEST SELLING PRODUCTS</h4>
                <a href="../Products/Prodbrowse.html"><h2><strong>></strong></h2></a>
            </div>

                <div class="Cards" id="bestSellingCards">
                    <!-- Loaded dynamically from database -->
                </div>    
        </div>

    </div>

    <script>
    // Prevent showing cached page after logout (back button)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    // User dropdown toggle
    const navUser = document.getElementById('NavUser');
    const userDropdown = document.getElementById('userDropdown');

    navUser.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', function(e) {
        if (!userDropdown.contains(e.target) && e.target !== navUser) {
            userDropdown.classList.remove('show');
        }
    });

    // Logout confirmation
    document.querySelectorAll('.logout-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = this.href;
            }
        });
    });

    // Load best-selling products from database
    async function loadBestSellers() {
        try {
            const res = await fetch('../Products/product_api.php?view=bestsellers');
            const data = await res.json();
            if (!data.success) return;

            const container = document.getElementById('bestSellingCards');
            if (!data.products.length) {
                container.innerHTML = '<p style="color:#9ca3af;padding:20px;">No products to display.</p>';
                return;
            }

            container.innerHTML = data.products.map(p => {
                const imgHtml = p.image_path
                    ? `<img src="../Products/${p.image_path}" alt="" class="Picture">`
                    : `<div class="no-product-image"></div>`;
                const price = 'P' + parseFloat(p.price).toFixed(2);
                const encodedName = encodeURIComponent(p.name);
                const encodedType = encodeURIComponent(p.type_of_product || '');
                const href = `../Products/ProductPage.html?id=${p.id}&name=${encodedName}&type=${encodedType}&price=${price}&img=${p.image_path || ''}`;

                return `
                <a class="CardProducts" href="${href}">
                    <div>${imgHtml}</div>
                    <div class="CardText">
                        <h2>${p.name}</h2>
                        <h3>${p.type_of_product || ''}</h3>
                    </div>
                </a>`;
            }).join('');
        } catch (err) {
            console.error('Failed to load best sellers:', err);
        }
    }

    loadBestSellers();
    </script>
    <script src="../CART/cart_badge.js"></script>
</body>
</html>
