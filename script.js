// Initialize cart from localStorage if available
let cart = localStorage.getItem('rhemaCart') ? JSON.parse(localStorage.getItem('rhemaCart')) : [];
// Initialize Stripe with a test publishable key (use your actual test key in production)
let stripe = Stripe('pk_test_51O9XYZLkozRXMgXYZabcdefghijklmnopqrstuvwxyz123456789');
let elements;
let cardElement;

document.addEventListener('DOMContentLoaded', function() {
    // Update cart count on page load
    updateCartCount();
    // Check if redirected from index page with a book to add to cart
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    const bookTitle = urlParams.get('bookTitle');
    const bookPrice = urlParams.get('bookPrice');
    
    if (bookId && bookTitle && bookPrice) {
        // Add the book to cart
        const existingItem = cart.find(item => item.id === bookId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ 
                id: bookId, 
                title: decodeURIComponent(bookTitle), 
                price: parseFloat(bookPrice), 
                quantity: 1 
            });
        }
        
        // Save cart to localStorage
        localStorage.setItem('rhemaCart', JSON.stringify(cart));
        
        // Update cart count
        setTimeout(() => {
            updateCartCount();
            
            // Show confirmation message
            const confirmMessage = document.createElement('div');
            confirmMessage.className = 'add-to-cart-confirmation';
            confirmMessage.innerHTML = `<i class="fas fa-check-circle"></i> "${decodeURIComponent(bookTitle)}" added to cart`;
            document.body.appendChild(confirmMessage);
            
            setTimeout(() => {
                confirmMessage.classList.add('show');
                setTimeout(() => {
                    confirmMessage.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(confirmMessage);
                    }, 300);
                }, 3000);
            }, 300);
        }, 500);
        
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // Form validation
    const contactForm = document.querySelector('.contact-form form');
    const donationForm = document.querySelector('.giving-form form');

    function validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea');
        let isValid = true;

        inputs.forEach(input => {
            const errorDiv = input.parentElement.querySelector('.error-message');
            const value = input.value.trim();
            errorDiv.textContent = '';
            input.classList.remove('error');

            if (!value) {
                isValid = false;
                errorDiv.textContent = `${input.name || 'This field'} is required`;
                input.classList.add('error');
            } else {
                switch(input.type) {
                    case 'email':
                        if (!validateEmail(value)) {
                            isValid = false;
                            errorDiv.textContent = 'Please enter a valid email address';
                            input.classList.add('error');
                        }
                        break;
                    case 'tel':
                        if (!/^\+?[\d\s-]{10,}$/.test(value)) {
                            isValid = false;
                            errorDiv.textContent = 'Please enter a valid phone number';
                            input.classList.add('error');
                        }
                        break;
                    case 'number':
                        if (isNaN(value) || (input.min && parseFloat(value) < parseFloat(input.min)) ||
                            (input.max && parseFloat(value) > parseFloat(input.max))) {
                            isValid = false;
                            errorDiv.textContent = `Please enter a valid number ${input.min ? 'from ' + input.min : ''} ${input.max ? 'to ' + input.max : ''}`;
                            input.classList.add('error');
                        }
                        break;
                }
            }
        });

        return isValid;
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm(this)) {
                alert('Thank you for your message. We will get back to you soon!');
                this.reset();
            }
        });
    }

    if (donationForm) {
        donationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm(this)) {
                alert('Thank you for your generous donation!');
                this.reset();
            }
        });
    }

    // Slideshow functionality
    const slideshow = document.querySelector('.gallery-slideshow');
    const slides = document.querySelectorAll('.gallery-slide');
    const dotsContainer = document.querySelector('.gallery-dots');
    let currentSlide = 0;
    let slideInterval;
    let touchStartX = 0;
    let touchEndX = 0;

    // Only initialize slideshow if elements exist
    if (slideshow && slides.length > 0 && dotsContainer) {
        // Create dot indicators
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('gallery-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        });

        const dots = document.querySelectorAll('.gallery-dot');

        // Navigation buttons
        const prevButton = document.querySelector('.gallery-nav.prev');
        const nextButton = document.querySelector('.gallery-nav.next');
        
        if (prevButton) prevButton.addEventListener('click', prevSlide);
        if (nextButton) nextButton.addEventListener('click', nextSlide);

        // Auto-advance slides
        startSlideshow();

        // Pause slideshow on hover
        slideshow.addEventListener('mouseenter', () => clearInterval(slideInterval));
        slideshow.addEventListener('mouseleave', startSlideshow);

        // Touch events for mobile
        slideshow.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            clearInterval(slideInterval);
        });

        slideshow.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            handleSwipe();
            startSlideshow();
        });

        // Keyboard navigation for slideshow
        document.addEventListener('keydown', (e) => {
            if (slideshow.contains(document.activeElement) || 
                document.activeElement.classList.contains('gallery-dot')) {
                if (e.key === 'ArrowLeft') prevSlide();
                if (e.key === 'ArrowRight') nextSlide();
            }
        });

        // Accessibility - make slides focusable and handle keyboard events
        slides.forEach((slide, index) => {
            slide.setAttribute('tabindex', '0');
            slide.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') goToSlide(index);
            });
        });
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Add visual feedback for swipe
                slides[currentSlide].style.transform = `translateX(${swipeDistance/5}px)`;
                setTimeout(() => {
                    slides[currentSlide].style.transform = '';
                    prevSlide();
                }, 50);
            } else {
                // Add visual feedback for swipe
                slides[currentSlide].style.transform = `translateX(${swipeDistance/5}px)`;
                setTimeout(() => {
                    slides[currentSlide].style.transform = '';
                    nextSlide();
                }, 50);
            }
        } else {
            // Snap back if swipe wasn't strong enough
            slides[currentSlide].style.transform = '';
        }
    }

    function updateSlides() {
        if (!slides || slides.length === 0) return;
        
        // Preload next image
        const nextIndex = (currentSlide + 1) % slides.length;
        const nextImage = slides[nextIndex].querySelector('img');
        if (nextImage) {
            const preloadImg = new Image();
            preloadImg.src = nextImage.src;
        }

        // Apply smooth transition with enhanced effects
        slides.forEach((slide, index) => {
            if (index === currentSlide) {
                // Make current slide visible first
                slide.style.visibility = 'visible';
                
                // Small delay for smoother transition
                setTimeout(() => {
                    slide.classList.add('active');
                }, 50);
                
                // Announce for screen readers
                slide.setAttribute('aria-hidden', 'false');
                
                // Focus for keyboard users
                if (document.activeElement === document.body) {
                    slide.focus({ preventScroll: true });
                }
            } else {
                slide.classList.remove('active');
                
                // Hide after transition completes
                setTimeout(() => {
                    if (!slide.classList.contains('active')) {
                        slide.style.visibility = 'hidden';
                    }
                }, 800);
                
                slide.setAttribute('aria-hidden', 'true');
            }
        });

        // Update dots
        const dots = document.querySelectorAll('.gallery-dot');
        if (dots && dots.length > 0) {
            dots.forEach((dot, index) => {
                if (index === currentSlide) {
                    dot.classList.add('active');
                    dot.setAttribute('aria-current', 'true');
                } else {
                    dot.classList.remove('active');
                    dot.removeAttribute('aria-current');
                }
            });
        }
        
        // Announce slide change for screen readers
        const liveRegion = document.getElementById('slideshow-live-region') || createLiveRegion();
        const currentSlideImg = slides[currentSlide].querySelector('img');
        const currentSlideAlt = currentSlideImg ? currentSlideImg.alt || 'Slide image' : 'Slide';
        liveRegion.textContent = `Showing slide ${currentSlide + 1} of ${slides.length}: ${currentSlideAlt}`;
    }
    
    function createLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'slideshow-live-region';
        liveRegion.className = 'sr-only';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(liveRegion);
        return liveRegion;
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        updateSlides();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateSlides();
    }

    function goToSlide(index) {
        currentSlide = index;
        updateSlides();
    }

    function startSlideshow() {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 6000); // Slightly longer interval for better viewing
    }

    // Store functionality
    const searchInput = document.getElementById('searchBooks');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortBooks');
    const cartModal = document.getElementById('cart-modal');

    if (searchInput) {
        searchInput.addEventListener('input', filterBooks);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterBooks);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', sortBooks);
    }

    function filterBooks() {
        if (!searchInput || !categoryFilter) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const books = document.querySelectorAll('.book-card');
        
        if (!books || books.length === 0) return;

        books.forEach(book => {
            const titleElement = book.querySelector('h3');
            if (!titleElement) return;
            
            const title = titleElement.textContent.toLowerCase();
            const bookCategory = book.dataset.category;
            const shouldShow =
                (searchTerm === '' || title.includes(searchTerm)) &&
                (category === 'all' || bookCategory === category);
            book.style.display = shouldShow ? 'block' : 'none';
        });
    }

    function sortBooks() {
        if (!sortSelect) return;
        
        const sortBy = sortSelect.value;
        const bookGrid = document.querySelector('.book-grid');
        const books = Array.from(document.querySelectorAll('.book-card'));
        
        if (!bookGrid || !books || books.length === 0) return;

        books.sort((a, b) => {
            const priceElementA = a.querySelector('.book-price');
            const priceElementB = b.querySelector('.book-price');
            const titleElementA = a.querySelector('h3');
            const titleElementB = b.querySelector('h3');
            
            if (!priceElementA || !priceElementB || !titleElementA || !titleElementB) return 0;
            
            const priceA = parseFloat(priceElementA.textContent.replace('$', '').replace('GHS', ''));
            const priceB = parseFloat(priceElementB.textContent.replace('$', '').replace('GHS', ''));
            const titleA = titleElementA.textContent;
            const titleB = titleElementB.textContent;

            switch(sortBy) {
                case 'price-low':
                    return priceA - priceB;
                case 'price-high':
                    return priceB - priceA;
                case 'name-asc':
                    return titleA.localeCompare(titleB);
                default:
                    return 0;
            }
        });

        books.forEach(book => bookGrid.appendChild(book));
    }

    function increaseQuantity(inputId) {
        const input = document.getElementById(inputId);
        const currentValue = parseInt(input.value);
        if (currentValue < parseInt(input.max)) {
            input.value = currentValue + 1;
        }
    }

    function decreaseQuantity(inputId) {
        const input = document.getElementById(inputId);
        const currentValue = parseInt(input.value);
        if (currentValue > parseInt(input.min)) {
            input.value = currentValue - 1;
        }
    }

    function addToCartWithQuantity(id, title, price, quantityInputId) {
        const quantityInput = document.getElementById(quantityInputId);
        const quantity = parseInt(quantityInput.value);
        
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ id, title, price, quantity });
        }
        
        // Save cart to localStorage
        localStorage.setItem('rhemaCart', JSON.stringify(cart));
        
        updateCartCount();
        showCart();
        
        // Show confirmation message
        const confirmMessage = document.createElement('div');
        confirmMessage.className = 'add-to-cart-confirmation';
        confirmMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${quantity} item(s) added to cart`;
        document.body.appendChild(confirmMessage);
        
        setTimeout(() => {
            confirmMessage.classList.add('show');
            setTimeout(() => {
                confirmMessage.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(confirmMessage);
                }, 300);
            }, 2000);
        }, 10);
    }

    function addToCart(id, title, price) {
        addToCartWithQuantity(id, title, price, 'quantity-1');
    }

    function buyNowWithQuantity(id, title, price, quantityInputId) {
        const quantityInput = document.getElementById(quantityInputId);
        const quantity = parseInt(quantityInput.value);
        
        // Add item to cart
        cart = [{ id, title, price, quantity }];
        
        // Save cart to localStorage
        localStorage.setItem('rhemaCart', JSON.stringify(cart));
        
        // Show a quick animation
        showBuyNowAnimation(title);
        
        // Proceed directly to checkout
        setTimeout(() => {
            proceedToCheckout();
        }, 1200);
    }

    function showBuyNowAnimation(title) {
        // Create animation container
        const animContainer = document.createElement('div');
        animContainer.className = 'buy-now-animation';
        
        // Create animation content
        animContainer.innerHTML = `
            <div class="animation-content">
                <div class="checkmark-circle">
                    <i class="fas fa-check"></i>
                </div>
                <p>"${title}" added to cart!</p>
                <p class="small">Proceeding to checkout...</p>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(animContainer);
        
        // Trigger animation
        setTimeout(() => {
            animContainer.classList.add('show');
        }, 10);
        
        // Remove after animation completes
        setTimeout(() => {
            animContainer.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(animContainer);
            }, 300);
        }, 1000);
    }

    function buyNow(id, title, price) {
        buyNowWithQuantity(id, title, price, 'quantity-1');
    }

    function updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function showCart() {
        const cartItems = document.getElementById('cart-items');
        const cartSubtotal = document.getElementById('cart-subtotal-amount');
        const cartShipping = document.getElementById('cart-shipping-amount');
        const cartTax = document.getElementById('cart-tax-amount');
        const cartTotal = document.getElementById('cart-total-amount');
        const cartModal = document.getElementById('cart-modal');
        
        // Load cart from localStorage if available
        if (cart.length === 0 && localStorage.getItem('rhemaCart')) {
            cart = JSON.parse(localStorage.getItem('rhemaCart'));
            updateCartCount();
        }
        
        cartModal.style.display = 'block';

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-shopping-cart" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">Your cart is empty</p>
                    <p style="color: #666; margin-bottom: 20px;">Browse our collection and add items to your cart</p>
                    <button onclick="closeCart()" class="primary-btn">Continue Shopping</button>
                </div>
            `;
            document.querySelector('.cart-buttons .primary-btn').disabled = true;
            
            // Hide summary sections when cart is empty
            document.querySelector('.cart-summary').style.display = 'none';
            document.querySelector('.cart-promo').style.display = 'none';
        } else {
            // Show summary sections when cart has items
            document.querySelector('.cart-summary').style.display = 'block';
            document.querySelector('.cart-promo').style.display = 'block';
            
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item" style="display: flex; padding: 15px; border-bottom: 1px solid #eee; position: relative;">
                    <div class="cart-item-image" style="width: 80px; margin-right: 15px;">
                        <img src="images/books/${item.id.replace('purpose-driven-life', 'book1')
                                              .replace('battlefield-of-mind', 'book2')
                                              .replace('mere-christianity', 'book3')
                                              .replace('case-for-christ', 'book4')
                                              .replace('power-of-faith', 'book5')
                                              .replace('divine-purpose', 'book6')}.jpg" 
                             alt="${item.title}" style="width: 100%; height: auto; border-radius: 4px;">
                    </div>
                    <div class="cart-item-details" style="flex-grow: 1;">
                        <span class="cart-item-title" style="font-weight: bold; display: block; margin-bottom: 5px;">${item.title}</span>
                        <span class="cart-item-price" style="color: #666; display: block; margin-bottom: 10px;">GHS ${item.price.toFixed(2)}</span>
                        <div class="cart-item-actions" style="display: flex; align-items: center; justify-content: space-between;">
                            <div class="cart-item-quantity" style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
                                <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})" 
                                        ${item.quantity <= 1 ? 'disabled' : ''} 
                                        style="width: 30px; height: 30px; background-color: #f1f1f1; border: none; cursor: pointer;">-</button>
                                <span style="padding: 0 10px; line-height: 30px;">${item.quantity}</span>
                                <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})"
                                        style="width: 30px; height: 30px; background-color: #f1f1f1; border: none; cursor: pointer;">+</button>
                            </div>
                            <span class="cart-item-subtotal" style="font-weight: bold;">GHS ${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="remove-btn" 
                            style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #e74c3c; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
            document.querySelector('.cart-buttons .primary-btn').disabled = false;
        }

        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = subtotal > 500 ? 0 : 25;
        const tax = subtotal * 0.05;
        const total = subtotal + shipping + tax;
        
        // Update summary values
        cartSubtotal.textContent = `GHS ${subtotal.toFixed(2)}`;
        cartShipping.textContent = subtotal > 500 ? 'FREE' : `GHS ${shipping.toFixed(2)}`;
        cartTax.textContent = `GHS ${tax.toFixed(2)}`;
        cartTotal.textContent = `GHS ${total.toFixed(2)}`;
    }

    function updateCartItemQuantity(id, newQuantity) {
        if (newQuantity <= 0) {
            removeFromCart(id);
            return;
        }
        
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('rhemaCart', JSON.stringify(cart));
            updateCartCount();
            showCart();
        }
    }

    function closeCart() {
        const cartModal = document.getElementById('cart-modal');
        cartModal.style.display = 'none';
    }
        
    function applyPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const promoMessage = document.getElementById('promo-message');
        const promoCode = promoInput.value.trim().toUpperCase();
        
        if (promoCode === '') {
            promoMessage.textContent = 'Please enter a promo code';
            promoMessage.style.color = '#e74c3c';
            return;
        }
        
        // Valid promo codes
        const promoCodes = {
            'RHEMA10': { discount: 0.1, message: '10% discount applied to your order!' },
            'FREESHIP': { discount: 0, message: 'Free shipping applied to your order!' },
            'WELCOME': { discount: 0.05, message: '5% discount applied to your order!' }
        };
        
        if (promoCodes[promoCode]) {
            promoMessage.textContent = promoCodes[promoCode].message;
            promoMessage.style.color = '#2ecc71';
            
            // In a real application, you would apply the discount to the cart
            // For this demo, we'll just refresh the cart display
            setTimeout(() => {
                showCart();
            }, 500);
        } else {
            promoMessage.textContent = 'Invalid promo code. Please try again.';
            promoMessage.style.color = '#e74c3c';
        }
    }

    function updateCartItemQuantity(id, newQuantity) {
        if (newQuantity <= 0) {
            removeFromCart(id);
            return;
        }
        
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('rhemaCart', JSON.stringify(cart));
            updateCartCount();
            showCart();
        }
    }

    function closeCart() {
        const cartModal = document.getElementById('cart-modal');
        cartModal.style.display = 'none';
    }
    
    function closeCheckout() {
        const checkoutModal = document.getElementById('checkout-modal');
        checkoutModal.classList.remove('active-modal');
        setTimeout(() => {
            checkoutModal.style.display = 'none';
        }, 300);
    }
    
    function applyPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const promoMessage = document.getElementById('promo-message');
        const promoCode = promoInput.value.trim().toUpperCase();
        
        if (promoCode === '') {
            promoMessage.textContent = 'Please enter a promo code';
            promoMessage.style.color = '#e74c3c';
            return;
        }
        
        // Valid promo codes
        const promoCodes = {
            'RHEMA10': { discount: 0.1, message: '10% discount applied to your order!' },
            'FREESHIP': { discount: 0, message: 'Free shipping applied to your order!' },
            'WELCOME': { discount: 0.05, message: '5% discount applied to your order!' }
        };
        
        if (promoCodes[promoCode]) {
            promoMessage.textContent = promoCodes[promoCode].message;
            promoMessage.style.color = '#2ecc71';
            
            // In a real application, you would apply the discount to the cart
            // For this demo, we'll just refresh the cart display
            setTimeout(() => {
                showCart();
            }, 500);
        } else {
            promoMessage.textContent = 'Invalid promo code. Please try again.';
            promoMessage.style.color = '#e74c3c';
        }
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('rhemaCart', JSON.stringify(cart));
        updateCartCount();
        showCart();
    }
    
    function proceedToCheckout() {
        // Hide cart modal
        const cartModal = document.getElementById('cart-modal');
        cartModal.style.display = 'none';
        
        // Show checkout modal with animation
        const checkoutModal = document.getElementById('checkout-modal');
        const checkoutItems = document.getElementById('checkout-items');
        const checkoutTotal = document.getElementById('checkout-total-amount');
        
        checkoutModal.style.display = 'block';
        
        // Reset checkout progress
        document.getElementById('step-cart').classList.add('active');
        document.getElementById('step-cart').classList.add('completed');
        document.getElementById('step-shipping').classList.add('active');
        document.getElementById('step-payment').classList.remove('active');
        
        // Add animation class
        setTimeout(() => {
            checkoutModal.classList.add('active-modal');
        }, 10);
        
        // Calculate total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Get book covers for visual appeal
        const bookCovers = cart.map(item => {
            // Extract book ID from the item ID
            const bookId = item.id.includes('book') ? item.id : 'book1';
            return `<img src="images/books/${bookId.replace('purpose-driven-life', 'book1')
                                              .replace('battlefield-of-mind', 'book2')
                                              .replace('mere-christianity', 'book3')
                                              .replace('case-for-christ', 'book4')
                                              .replace('power-of-faith', 'book5')
                                              .replace('divine-purpose', 'book6')}.jpg" 
                   alt="${item.title}" class="checkout-book-cover">`;
        });
        
        // Display items in checkout with enhanced visuals
        checkoutItems.innerHTML = `
            <div class="checkout-header">
                <h4>Your Order Summary</h4>
                <div class="checkout-book-covers">
                    ${bookCovers.join('')}
                </div>
            </div>
            ${cart.map(item => `
                <div class="cart-item checkout-item">
                    <div class="checkout-item-details">
                        <span class="checkout-item-title">${item.title}</span>
                        <span class="checkout-item-price">GHS ${item.price.toFixed(2)} x ${item.quantity}</span>
                    </div>
                    <div class="checkout-item-total">
                        GHS ${(item.price * item.quantity).toFixed(2)}
                    </div>
                </div>
            `).join('')}
            <div class="checkout-subtotal">
                <span>Subtotal:</span>
                <span>GHS ${total.toFixed(2)}</span>
            </div>
            <div class="checkout-shipping">
                <span>Shipping:</span>
                <span>${total > 500 ? 'FREE' : 'GHS 25.00'}</span>
            </div>
            <div class="checkout-tax">
                <span>Tax (5%):</span>
                <span>GHS ${(total * 0.05).toFixed(2)}</span>
            </div>
        `;
        
        // Calculate and display total with tax and shipping
        const shipping = total > 500 ? 0 : 25;
        const tax = total * 0.05;
        const grandTotal = total + shipping + tax;
        checkoutTotal.textContent = `GHS ${grandTotal.toFixed(2)}`;
        
        // Initialize Stripe Elements if not already done
        if (!elements) {
            elements = stripe.elements();
            cardElement = elements.create('card', {
                style: {
                    base: {
                        color: '#32325d',
                        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                        fontSmoothing: 'antialiased',
                        fontSize: '16px',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    },
                    invalid: {
                        color: '#fa755a',
                        iconColor: '#fa755a'
                    }
                }
            });
            
            cardElement.mount('#card-element');
            
            // Handle validation errors
            cardElement.on('change', function(event) {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
            
            // Handle form submission
            const form = document.getElementById('payment-form');
            form.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                // Update progress indicator
                document.getElementById('step-shipping').classList.add('completed');
                document.getElementById('step-payment').classList.add('active');
                
                await checkout();
            });
        }
        
        // Add payment method selection
        const paymentMethodSelector = document.getElementById('payment-method-selector');
        if (paymentMethodSelector) {
            paymentMethodSelector.addEventListener('change', function(e) {
                const selectedMethod = e.target.value;
                const cardPaymentSection = document.getElementById('card-payment-section');
                const mobileMoneySection = document.getElementById('mobile-money-section');
                
                if (selectedMethod === 'card') {
                    cardPaymentSection.style.display = 'block';
                    mobileMoneySection.style.display = 'none';
                } else if (selectedMethod === 'mobile-money') {
                    cardPaymentSection.style.display = 'none';
                    mobileMoneySection.style.display = 'block';
                }
            });
        }
    }
    
    function backToCart() {
        // Hide checkout modal with animation
        const checkoutModal = document.getElementById('checkout-modal');
        checkoutModal.classList.remove('active-modal');
        
        setTimeout(() => {
            checkoutModal.style.display = 'none';
            
            // Show cart modal
            showCart();
        }, 300);
    }
    
    function closeConfirmation() {
        const confirmationModal = document.getElementById('order-confirmation-modal');
        confirmationModal.classList.remove('active-modal');
        setTimeout(() => {
            confirmationModal.style.display = 'none';
            window.location.href = 'store.html'; // Redirect to store after order
        }, 300);
    }
    
    function viewOrderDetails() {
        // In a real application, this would navigate to an order details page
        // For this demo, we'll just show an alert with more details
        const orderNumber = document.getElementById('order-number').textContent;
        
        alert(`
Order Details for Order #${orderNumber}
--------------------------------
Status: Processing
Payment Method: Credit Card / Mobile Money
Estimated Delivery: 3-5 business days

Thank you for shopping with Rhema Calvary Center!
        `);
    }

    async function checkout() {
        // Get the submit button
        const submitButton = document.querySelector('#payment-form .primary-btn');
        
        try {
            // Validate customer information
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const address = document.getElementById('address');
            const phone = document.getElementById('phone');
            
            // Simple validation
            if (!name || !name.value || !email || !email.value || !address || !address.value || !phone || !phone.value) {
                throw new Error('Please fill in all required fields');
            }
            
            // Disable the submit button to prevent multiple submissions
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';
            
            // In a real environment, this would call the server
            // For demo purposes, we'll simulate a successful checkout
            
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Calculate total
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = subtotal > 500 ? 0 : 25;
            const tax = subtotal * 0.05;
            const total = subtotal + shipping + tax;
            
            // Generate order number
            const orderNumber = Math.floor(Math.random() * 1000000);
            
            // Hide checkout modal
            const checkoutModal = document.getElementById('checkout-modal');
            checkoutModal.style.display = 'none';
            
            // Show confirmation modal with animation
            const confirmationModal = document.getElementById('order-confirmation-modal');
            document.getElementById('order-number').textContent = orderNumber;
            document.getElementById('order-total').textContent = `GHS ${total.toFixed(2)}`;
            
            // Format current date for order date
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('order-date').textContent = now.toLocaleDateString('en-US', options);
            
            confirmationModal.style.display = 'block';
            
            // Add animation class
            setTimeout(() => {
                confirmationModal.classList.add('active-modal');
            }, 10);
            
            // Save order to DB
            const order = {
                id: orderNumber.toString(),
                items: [...cart],
                subtotal: subtotal,
                shipping: shipping,
                tax: tax,
                total: total,
                date: new Date().toISOString(),
                customer: {
                    name: name.value,
                    email: email.value,
                    address: address.value,
                    phone: phone.value
                },
                status: 'completed'
            };
            
            // Save order to DB if DB is available
            try {
                if (typeof DB !== 'undefined' && DB.addOrder) {
                    DB.addOrder(order);
                }
            } catch (err) {
                console.log('Error saving order:', err);
                // Continue with checkout even if DB save fails
            }
            
            // Clear cart
            cart = [];
            localStorage.removeItem('rhemaCart');
            updateCartCount();
            
            // Reset form
            document.getElementById('payment-form').reset();
            
            /*
            // This is the code that would be used in production with a real backend
            const { paymentMethod, error } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                }
            });
            
            if (error) {
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Purchase';
                return;
            }
            
            const response = await fetch('/process-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    paymentMethodId: paymentMethod.id,
                    amount: total * 100, // in cents
                    items: cart,
                    customer: {
                        name: document.getElementById('name').value,
                        email: document.getElementById('email').value,
                        address: document.getElementById('address').value,
                        phone: document.getElementById('phone').value
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.error) {
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = result.error;
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Purchase';
            } else {
                // Payment successful, show confirmation
                // Hide checkout modal
                const checkoutModal = document.getElementById('checkout-modal');
                checkoutModal.style.display = 'none';
                
                // Show confirmation modal
                const confirmationModal = document.getElementById('order-confirmation-modal');
                document.getElementById('order-number').textContent = result.orderId;
                document.getElementById('order-total').textContent = `GHS ${total.toFixed(2)}`;
                confirmationModal.style.display = 'block';
                
                // Clear cart
                cart = [];
                localStorage.removeItem('rhemaCart');
                updateCartCount();
                
                // Reset form
                document.getElementById('payment-form').reset();
            }
            */
        } catch (error) {
            console.error('Error:', error);
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = 'There was an error processing your payment. Please try again.';
            
            // Re-enable the submit button
            const submitButton = document.querySelector('#payment-form .primary-btn');
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Purchase';
        }
    }

    // Close modals when clicking outside
    window.onclick = function(event) {
        const cartModal = document.getElementById('cart-modal');
        const checkoutModal = document.getElementById('checkout-modal');
        const confirmationModal = document.getElementById('order-confirmation-modal');
        
        if (event.target === cartModal) {
            closeCart();
        }
        
        if (event.target === checkoutModal) {
            closeCheckout();
        }
        
        if (event.target === confirmationModal) {
            closeConfirmation();
        }
    };

    // Social interaction buttons
    const likeButtons = document.querySelectorAll('.like-btn');
    const shareButtons = document.querySelectorAll('.share-btn');
    const downloadButtons = document.querySelectorAll('.download-btn');

    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const likeCount = this.querySelector('span');
            let count = parseInt(likeCount.textContent.split(' ')[0]) || 0;
            count++;
            likeCount.textContent = `${count} likes`;
            this.classList.add('liked');
        });
    });

    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (navigator.share) {
                navigator.share({
                    title: 'Rhema Calvary Center',
                    text: 'Check out this event at Rhema Calvary Center!',
                    url: window.location.href,
                })
                .catch(error => console.log('Error sharing:', error));
            } else {
                alert('Share this link: ' + window.location.href);
            }
        });
    });

    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const eventTitle = this.closest('.event-info').querySelector('h3').textContent;
            const eventDate = this.closest('.event-info').querySelector('p').textContent;

            const eventDetails = `Event: ${eventTitle}\nDate: ${eventDate}\nLocation: Rhema Calvary Center\n\nWe look forward to seeing you there!`;

            const blob = new Blob([eventDetails], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${eventTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // Comments functionality
    const commentSections = document.querySelectorAll('.comments-section');

    commentSections.forEach(section => {
        const textarea = section.querySelector('textarea');
        const postButton = section.querySelector('button');

        postButton.addEventListener('click', function() {
            const commentText = textarea.value.trim();
            if (commentText) {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';

                const commentAuthor = document.createElement('span');
                commentAuthor.className = 'comment-author';
                commentAuthor.textContent = 'Guest';

                const commentTime = document.createElement('span');
                commentTime.className = 'comment-time';
                commentTime.textContent = new Date().toLocaleString();

                const commentContent = document.createElement('p');
                commentContent.className = 'comment-content';
                commentContent.textContent = commentText;

                commentElement.appendChild(commentAuthor);
                commentElement.appendChild(commentTime);
                commentElement.appendChild(commentContent);

                // Insert before the textarea
                section.insertBefore(commentElement, textarea);

                // Clear the textarea
                textarea.value = '';
            }
        });
    });
});

// Function to add to cart and redirect to store page
function addToCartAndRedirect(id, title, price) {
    // Create URL with parameters
    const redirectUrl = `store.html?bookId=${id}&bookTitle=${encodeURIComponent(title)}&bookPrice=${price}`;
    
    // Create animation container
    const animContainer = document.createElement('div');
    animContainer.className = 'add-to-cart-animation';
    animContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
    `;
    
    // Create animation content
    const animContent = document.createElement('div');
    animContent.className = 'animation-content';
    animContent.style.cssText = `
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        max-width: 80%;
        transform: scale(0.8);
        transition: transform 0.3s;
        box-shadow: 0 5px 30px rgba(0,0,0,0.3);
    `;
    
    // Create checkmark circle
    const checkmarkCircle = document.createElement('div');
    checkmarkCircle.className = 'checkmark-circle';
    checkmarkCircle.style.cssText = `
        width: 80px;
        height: 80px;
        background-color: #4CAF50;
        border-radius: 50%;
        margin: 0 auto 20px;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // Create checkmark icon
    const checkmarkIcon = document.createElement('i');
    checkmarkIcon.className = 'fas fa-check';
    checkmarkIcon.style.cssText = `
        color: white;
        font-size: 40px;
    `;
    
    // Create message
    const message = document.createElement('p');
    message.style.cssText = `
        margin: 10px 0;
        font-size: 18px;
        font-weight: bold;
    `;
    message.textContent = `"${title}" added to cart!`;
    
    // Create submessage
    const submessage = document.createElement('p');
    submessage.className = 'small';
    submessage.style.cssText = `
        font-size: 14px;
        opacity: 0.7;
        font-weight: normal;
    `;
    submessage.textContent = 'Redirecting to store...';
    
    // Assemble the elements
    checkmarkCircle.appendChild(checkmarkIcon);
    animContent.appendChild(checkmarkCircle);
    animContent.appendChild(message);
    animContent.appendChild(submessage);
    animContainer.appendChild(animContent);
    
    // Add to body
    document.body.appendChild(animContainer);
    
    // Trigger animation
    setTimeout(() => {
        animContainer.style.opacity = '1';
        animContainer.style.visibility = 'visible';
        animContent.style.transform = 'scale(1)';
    }, 10);
    
    // Redirect after animation
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 1200);
}