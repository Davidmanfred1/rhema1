import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    googleProvider,
    facebookProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    collection,
    addDoc,
    getDoc,
    setDoc,
    doc
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            updateUIForAuthenticatedUser(user);
        } else {
            // User is signed out
            updateUIForUnauthenticatedUser();
        }
    });

    // Update UI based on authentication state
    function updateUIForAuthenticatedUser(user) {
        // Update navigation
        const membersLink = document.querySelector('a[href="members.html"]');
        if (membersLink) {
            membersLink.textContent = 'My Account';
        }

        // Update members hero section if on members page
        const membersHero = document.querySelector('.members-hero-content');
        if (membersHero) {
            membersHero.innerHTML = `
                <h1>Welcome, ${user.displayName || 'Member'}</h1>
                <p>Access your exclusive member resources and connect with our community</p>
                <div class="members-auth-buttons">
                    <a href="dashboard.html" class="auth-button login">My Dashboard</a>
                    <button id="logout-btn" class="auth-button signup">Sign Out</button>
                </div>
            `;

            // Add logout functionality
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    try {
                        await signOut(auth);
                        window.location.href = 'index.html';
                    } catch (error) {
                        console.error("Error signing out: ", error);
                        alert("Error signing out. Please try again.");
                    }
                });
            }
        }
    }

    function updateUIForUnauthenticatedUser() {
        // Update navigation
        const membersLink = document.querySelector('a[href="members.html"]');
        if (membersLink) {
            membersLink.textContent = 'Members';
        }

        // If on members page, ensure the default UI is shown
        const membersHero = document.querySelector('.members-hero-content');
        if (membersHero && !membersHero.querySelector('.auth-button.login[href="login.html"]')) {
            membersHero.innerHTML = `
                <h1>Welcome to the Members' Zone</h1>
                <p>Connect with our community, access exclusive resources, and grow in your faith journey</p>
                <div class="members-auth-buttons">
                    <a href="login.html" class="auth-button login">Login</a>
                    <a href="signup.html" class="auth-button signup">Sign Up</a>
                </div>
            `;
        }
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => {
                    // Close all other items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                        }
                    });
                    
                    // Toggle current item
                    item.classList.toggle('active');
                });
            }
        });
        
        // Open first FAQ item by default
        faqItems[0].classList.add('active');
    }
    
    // Testimonials Slider
    const testimonials = document.querySelectorAll('.testimonial');
    const dotsContainer = document.querySelector('.testimonial-dots');
    let currentSlide = 0;
    let slideInterval;
    
    if (testimonials.length > 0 && dotsContainer) {
        // Create dots
        testimonials.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('testimonial-dot');
            if (index === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => {
                showSlide(index);
            });
            
            dotsContainer.appendChild(dot);
        });
        
        // Hide all slides except the first one
        testimonials.forEach((slide, index) => {
            if (index !== 0) {
                slide.style.display = 'none';
            }
        });
        
        // Auto-rotate slides
        slideInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % testimonials.length;
            showSlide(currentSlide);
        }, 5000);
        
        function showSlide(index) {
            testimonials.forEach((slide, i) => {
                slide.style.display = i === index ? 'block' : 'none';
            });
            
            const dots = document.querySelectorAll('.testimonial-dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            
            currentSlide = index;
        }
    }
    
    // Password Toggle
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const loginForm = document.getElementById('login-form');
    
    // Login Form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;
            
            if (!email || !password) {
                alert("Please enter both email and password");
                return;
            }
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Error signing in: ", error);
                let errorMessage = "Error signing in. Please check your credentials and try again.";
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "Invalid email or password";
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = "Too many failed login attempts. Please try again later.";
                }
                
                alert(errorMessage);
            }
        });
    }

    // Password toggle functionality
    if (togglePasswordButtons.length > 0) {
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', function() {
                const passwordInput = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                if (passwordInput && icon) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            });
        });
    }

    // Forgot password functionality
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Please enter your email address:');
            if (email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    alert('Password reset email sent. Please check your inbox.');
                } catch (error) {
                    console.error("Error sending password reset email: ", error);
                    let errorMessage = "Error sending password reset email. Please try again.";
                    
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = "No account found with this email address.";
                    }
                    
                    alert(errorMessage);
                }
            }
        });
    }

    // Member Services Tab Switching
    const tabButtons = document.querySelectorAll('.forms-tabs .tab-button');
    const formTabs = document.querySelectorAll('.forms-container .form-tab');

    if (tabButtons.length > 0 && formTabs.length > 0) {
        tabButtons.forEach((btn, idx) => {
            btn.addEventListener('click', function() {
                // Remove active from all tabs and buttons
                tabButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                formTabs.forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.display = 'none';
                    tab.style.opacity = 0;
                });
                // Activate current
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                const tabId = this.getAttribute('data-tab') + '-form';
                const activeTab = document.getElementById(tabId);
                if (activeTab) {
                    activeTab.classList.add('active');
                    activeTab.style.display = 'block';
                    setTimeout(() => { activeTab.style.opacity = 1; }, 10);
                }
            });
        });
        // Initialize: show only the first tab
        formTabs.forEach((tab, i) => {
            if (i === 0) {
                tab.style.display = 'block';
                tab.style.opacity = 1;
            } else {
                tab.style.display = 'none';
                tab.style.opacity = 0;
            }
        });
    }

    // Cleanup function
    return () => {
        if (slideInterval) {
            clearInterval(slideInterval);
        }
    };
});