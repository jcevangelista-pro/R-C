<?php require_once __DIR__ . '/../Registration/session_guard.php'; ?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>R&C Printing Services</title>
    <link rel="stylesheet" href="LandingPage.css">
</head>

<body>

    <!--Navigation Bar-->
    <nav class="Navbar">
            <a href="LandingPage.php" id="BName">R&C PRINTING SERVICES</a>
        <ul>
            <li><a href=""><img src="../imgs/search.png" alt="" class="Img"></a></li>
            <li><a href=""><img src="../imgs/typing.png" alt="" class="Img"></a></li>
            <li><a href=""><img src="../imgs/trolley.png" alt="" class="Img"></a></li>
            <li><a href="">HOME</a></li>
            <li><a href="">PRODUCTS</a></li>
            <li><a href="">PORTFOLIO</a></li>
            <li class="mobile-menu-item">
                <a href=""><img src="../imgs/user.png" alt="" class="Img"></a>
                <div class="mobile-sidebar">
                    <a href=""><img src="../imgs/search.png" alt="" class="sidebar-icon"> Search</a>
                    <a href=""><img src="../imgs/typing.png" alt="" class="sidebar-icon"> Messages</a>
                    <a href=""><img src="../imgs/trolley.png" alt="" class="sidebar-icon"> Cart</a>
                    <a href="LandingPage.php">HOME</a>
                    <a href="../Products/ProductPage.html">PRODUCTS</a>
                    <a href="../Portfolio/PortfolioPage.html">PORTFOLIO</a>
                    <a href="../Registration/logout.php" class="logout-link">LOG OUT</a>
                </div>
            </li>
        </ul>
    </nav>

    <!--Welcoming Statement-->
    <div class="RContainer">
        <div class="WSContainer">
            <div class="TextContainer">
                <p class="Statement">YOUR VISION, <br>
                    WE DELIVER
                <p>
                <p>We provide reliable and professional printing services focused on <br>
                    supporting businesses with high-quality marketing materials, <br>
                    branded products, and custom print solutions while also serving <br>
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
                <h2><strong>></strong></h2>
            </div>

                <div class="Cards">
                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

                    <a class="CardProducts" href="../Products/ProductPage.html?name=Tumbler (360ml)&type=Mug %26 Tumbler&price=P45.00&img=MugPicture.jpg">
                        <div>
                            <img src="../imgs/MugPicture.jpg" alt="" class="Picture">
                        </div>
                        <div class="CardText">
                            <h2>Tumbler (360ml)</h2>
                            <h3>Mug & Tumbler</h3>
                        </div>
                    </a>

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

    // Also check on page load via a quick session ping
    fetch('../Registration/check_session.php')
        .then(res => res.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = '../Registration/LogInPage.html';
            }
        })
        .catch(() => {});

    // Mobile sidebar toggle on click
    const menuItem = document.querySelector('.mobile-menu-item');
    if (menuItem) {
        menuItem.addEventListener('click', function(e) {
            if (e.target.closest('.mobile-sidebar')) return;
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (!menuItem.contains(e.target)) {
                menuItem.classList.remove('open');
            }
        });
    }

    // Logout confirmation
    document.querySelectorAll('.logout-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = this.href;
            }
        });
    });
    </script>
    
</body>
</html>
