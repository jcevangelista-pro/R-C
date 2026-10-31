<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>R&C Printing Services</title>
    <link rel="icon" type="image/x-icon" href="../imgs/image 2.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="LandingPage.css?v=6">
    <link rel="stylesheet" href="../CustomerNav.css">
</head>

<body>

    <!--Navigation Bar-->
    <nav class="Navbar">
            <a href="LandingPage.php" id="BName">R&C PRINTING SERVICES</a>
        <ul>
            <!-- <li><a href=""><img src="../imgs/typing.png" alt="" class="Img"></a></li> -->
            <li><a href="../Notifications/notifications.html" title="Notifications"><img src="../OrderProcess/OrderProcessImgs/Alarm.png" alt="Notifications" class="Img"></a></li>
            <li><a href="../CART/cart.html" title="Cart"><img src="../imgs/trolley.png" alt="Cart" class="Img"></a></li>
            <li><a href="../MyOrders/Myorder.html" title="My Orders"><img src="../OrderProcess/OrderProcessImgs/billing.png" alt="My Orders" class="Img"></a></li>
            <li><a href="LandingPage.php" class="ActiveLink">HOME</a></li>
            <li><a href="../Products/Prodbrowse.html">PRODUCTS</a></li>
            <li><a href="../Portfolio/PortfolioPage.html">PORTFOLIO</a></li>
            <li class="user-menu-item">
                <a href="" id="NavUser" title="Profile"><img src="../imgs/user.png" alt="Profile" class="Img"></a>
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
                        <img src="../imgs/landingPagepic2.jpg" alt="" class="Pictures" id="Picture2">
                    </div>
                        <img src="../imgs/landingPagepic3.jpg" alt="" class="Pictures" id="Picture3">
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



<section class="section about" id="about">
  <div class="about-grid">
    <div>
      <h2>About Us</h2>
      <div class="sub">Your Vision, We Deliver</div>
      <p style="margin-top:28px">R&amp;C Printing Services started in <b>2020</b> in <b>Kay-anlog, Calamba, Laguna</b> as R&amp;C Party Buddies, a small shop made to meet the growing demand for personalized party supplies. After officially registering with the BIR, it became R&amp;C Printing Services and is now based in <b>Cabuyao, Laguna</b>.</p>
      <p style="margin-top:10px">We make custom mugs, tumblers, caps, t-shirts, jerseys, sublimation prints, pens, notepads, and souvenirs, for single pieces or bulk orders.</p>
      <div class="stats">
        <div class="stat"><small>Since</small><strong>2020</strong></div>
        <div class="stat"><small>Years in business</small><strong>6+ years</strong></div>
      </div>
    </div>
    <div class="photo"><img src="../imgs/logo.jpg" alt=""></div>
  </div>
</section>

<section class="section who" id="portfolio">
  <h2>Who We Serve</h2>
  <div class="sub">We create custom prints for all kinds of customers</div>
  <div class="cards">
    <div class="card"><h4>Businesses</h4><p>Branded merchandise, marketing materials, and promotional items.</p></div>
    <div class="card"><h4>Schools</h4><p>Uniforms, event prints, and academic project materials.</p></div>
    <div class="card"><h4>Organizations &amp; Events</h4><p>Custom tumblers, singlets, and giveaways for groups and events.</p></div>
    <div class="card"><h4>Individuals</h4><p>Personalized gifts and one-of-a-kind prints for personal use.</p></div>
  </div>
</section>

<section class="section contact" id="contact">
  <div class="contact-grid">
    <div>
      <h2>Contact Us</h2>
      <p class="lead">Have a question? Message us.</p>
      <div class="info">
        <div><i class="ic-text">📍</i>Cabuyao, Laguna</div>
        <div><i><img src="../imgs/viber.png" alt="Viber"></i>0992-XXX-XXXX</div>
        <div><i class="ic-text">✉️</i><a href="">randcprintingservices@gmail.com</a></div>
        <div><i><img src="../imgs/fb.png" alt="Facebook"></i><a href="https://www.facebook.com/RCpartybuddy">R&C Printing Services</a></div>
        <div><i><img src="../imgs/ig.png" alt="Tiktok"></i><a href="https://www.instagram.com/rc_printing_services/">ecclang</a></div>
        <div><i class="ic-text">🕒</i>8:00 am - 5:00 pm</div>
      </div>
    </div>
    <form id="f" novalidate>
      <input type="text" placeholder="Your Name" aria-label="Your Name" required>
      <input type="email" placeholder="Email" aria-label="Email" required>
      <textarea placeholder="Message" aria-label="Message" required></textarea>
      <button type="submit">SEND MESSAGE</button>
      <div id="sent" role="status">Thanks! Your message was received.</div>
    </form>
  </div>
</section>

<footer>
  <span>© 2026 R&amp;C Printing Services. All rights reserved.</span>
</footer>

<script>
document.getElementById('f').addEventListener('submit',function(e){
  e.preventDefault();
  document.getElementById('sent').style.display='block';
  this.reset();
});
</script>

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
                const productQuery = new URLSearchParams({
                    id: p.id,
                    name: p.name,
                    type: p.type_of_product || '',
                    price: price,
                    img: p.image_path || '',
                    return: 'home'
                });
                const href = '../Products/ProductPage.html?' + productQuery.toString();

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
