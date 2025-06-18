// Admin authentication and session management
let adminSession = null;

function sanitizeInput(input) {
    return input.replace(/[<>"'&]/g, '');
}

function hashPassword(password) {
    // Using SHA-256 for password hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    return crypto.subtle.digest('SHA-256', data)
        .then(hash => {
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        });
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
    if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
    if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
    if (!hasNumbers) errors.push('Password must contain at least one number');
    if (!hasSpecialChar) errors.push('Password must contain at least one special character');
    
    return errors;
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const username = sanitizeInput(document.getElementById('username').value.trim());
    const password = document.getElementById('password').value;
    const messageBox = document.getElementById('loginMessage');

    messageBox.textContent = '';
    messageBox.style.color = 'red';

    if (!username || !password) {
        messageBox.textContent = 'Username and password are required';
        return;
    }

    try {
        const hashedPassword = await hashPassword(password);
        const storedAdmin = DB.validateAdmin(username, hashedPassword);
        
        if (storedAdmin) {
            const sessionToken = await generateSessionToken();
            adminSession = { 
                username: username,
                token: sessionToken,
                timestamp: Date.now(),
                expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours expiration
            };
            localStorage.setItem('adminSession', JSON.stringify(adminSession));
            window.location.href = 'admin-dashboard.html';
        } else {
            messageBox.textContent = 'Invalid username or password';
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageBox.textContent = 'An error occurred during login';
    }
}

async function generateSessionToken() {
    const randomBuffer = new Uint8Array(32);
    crypto.getRandomValues(randomBuffer);
    return Array.from(randomBuffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function checkAdminAuth() {
    const session = JSON.parse(localStorage.getItem('adminSession'));
    if (!session || !session.token || Date.now() > session.expiresAt) {
        localStorage.removeItem('adminSession');
        if (!window.location.href.includes('admin.html')) {
            window.location.href = 'admin.html';
        }
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'admin.html';
}

// Initialize dashboard
let products = [];
let orders = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminAuth()) return;
    
    // Initialize DB if needed
    DB.init();
    
    // Load initial data
    products = DB.getProducts();
    orders = DB.getOrders();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize views
    updateProductGrid();
    initializeOrders();
    initializeAnalytics();
    
    // Set admin name
    const session = JSON.parse(localStorage.getItem('adminSession'));
    if (session) {
        document.getElementById('adminName').textContent = session.username;
    }
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.admin-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            showSection(section);
        });
    });

    // Forms
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Filters
    const filterElements = ['orderStatus', 'orderSearch', 'paymentStatus', 'orderDateRange'];
    filterElements.forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateOrderList);
    });
    document.getElementById('orderSearch')?.addEventListener('input', updateOrderList);
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.admin-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

// Product Management
function showAddProductModal() {
    document.getElementById('productModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const imageFile = formData.get('image');
    
    const product = {
        id: Date.now(),
        title: sanitizeInput(formData.get('title')),
        author: sanitizeInput(formData.get('author')),
        description: sanitizeInput(formData.get('description')),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        image: imageFile ? await handleImageUpload(imageFile) : 'images/default-book.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (formData.get('productId')) {
        DB.updateProduct(parseInt(formData.get('productId')), product);
    } else {
        DB.addProduct(product);
    }
    
    products = DB.getProducts();
    updateProductGrid();
    closeProductModal();
}

async function handleImageUpload(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

function updateProductGrid() {
    const grid = document.querySelector('.product-grid');
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.title} Cover" loading="lazy">
            </div>
            <div class="product-info">
                <h3>${product.title}</h3>
                <p class="author">Author: ${product.author}</p>
                <p class="price">Price: GHS ${product.price.toFixed(2)}</p>
                <p class="category">Category: ${product.category}</p>
                <p class="description">${product.description}</p>
                <div class="product-actions">
                    <button onclick="editProduct(${product.id})" class="edit-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="delete-btn">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('modalTitle').textContent = 'Edit Product';
        const form = document.getElementById('productForm');
        form.elements['title'].value = product.title;
        form.elements['author'].value = product.author;
        form.elements['description'].value = product.description;
        form.elements['price'].value = product.price;
        form.elements['category'].value = product.category;
        form.elements['productId'].value = product.id;
        showAddProductModal();
    }
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        DB.deleteProduct(productId);
        products = DB.getProducts();
        updateProductGrid();
    }
}

// Order Management
function initializeOrders() {
    orders = DB.getOrders();
    updateOrderList();
}

function updateOrderList() {
    const status = document.getElementById('orderStatus').value;
    const searchQuery = document.getElementById('orderSearch').value.toLowerCase();
    const paymentStatus = document.getElementById('paymentStatus').value;
    const dateRange = document.getElementById('orderDateRange').value;

    let filteredOrders = orders;

    if (status !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    if (paymentStatus !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.paymentStatus === paymentStatus);
    }

    if (dateRange) {
        const today = new Date();
        const filterDate = new Date();
        switch(dateRange) {
            case 'today':
                filteredOrders = filteredOrders.filter(order => 
                    new Date(order.date).toDateString() === today.toDateString());
                break;
            case 'week':
                filterDate.setDate(today.getDate() - 7);
                filteredOrders = filteredOrders.filter(order => 
                    new Date(order.date) >= filterDate);
                break;
            case 'month':
                filterDate.setMonth(today.getMonth() - 1);
                filteredOrders = filteredOrders.filter(order => 
                    new Date(order.date) >= filterDate);
                break;
        }
    }

    if (searchQuery) {
        filteredOrders = filteredOrders.filter(order => 
            order.customer.toLowerCase().includes(searchQuery) ||
            order.id.toString().includes(searchQuery) ||
            order.email.toLowerCase().includes(searchQuery));
    }

    const orderList = document.querySelector('.order-list');
    orderList.innerHTML = filteredOrders.map(order => `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-header">
                <h3>Order #${order.id}</h3>
                <div class="status-badges">
                    <select class="order-status-select" onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <span class="payment-status ${order.paymentStatus}">${order.paymentStatus}</span>
                </div>
            </div>
            <div class="order-details">
                <p><strong>Customer:</strong> ${order.customer}</p>
                <p><strong>Email:</strong> ${order.email}</p>
                <p><strong>Total:</strong> GHS ${order.total.toFixed(2)}</p>
                <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
                <div class="order-items">
                    <h4>Items:</h4>
                    <ul>
                        ${order.items.map(item => `
                            <li>${item.title} - GHS ${item.price.toFixed(2)} x ${item.quantity}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            <div class="order-actions">
                <button onclick="verifyPayment(${order.id})" class="payment-btn">
                    <i class="fas fa-check-circle"></i> Verify Payment
                </button>
                <button onclick="sendOrderEmail(${order.id})" class="email-btn">
                    <i class="fas fa-envelope"></i> Send Email
                </button>
            </div>
        </div>
    `).join('');
}

function updateOrderStatus(orderId, newStatus) {
    if (DB.updateOrderStatus(orderId, newStatus)) {
        orders = DB.getOrders();
        updateOrderList();
        updateAnalytics();
        sendOrderStatusNotification(orders.find(o => o.id === orderId));
    }
}

function verifyPayment(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    order.paymentStatus = order.paymentStatus === 'pending' ? 'verified' : 'pending';
    updateOrderList();
}

function sendOrderEmail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    alert(`Email notification sent to ${order.email} regarding Order #${order.id}`);
}

function sendOrderStatusNotification(order) {
    console.log(`Order #${order.id} status updated to: ${order.status}`);
}

// Analytics functionality
function initializeAnalytics() {
    const today = new Date();
    document.getElementById('startDate').value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    updateAnalytics();
}

function updateAnalytics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const analytics = DB.getAnalytics(startDate, endDate);

    document.getElementById('totalSales').textContent = `GHS ${analytics.totalSales.toFixed(2)}`;
    document.getElementById('totalOrders').textContent = analytics.totalOrders;
    document.getElementById('productsSold').textContent = analytics.productsSold;

    updateSalesChart(startDate, endDate);
    updateProductsChart(startDate, endDate);
}

function updateSalesChart(startDate, endDate) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (window.salesChart) window.salesChart.destroy();

    const salesData = aggregateSalesData(startDate, endDate);
    window.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesData.labels,
            datasets: [{
                label: 'Daily Sales (GHS)',
                data: salesData.values,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Sales Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales (GHS)'
                    }
                }
            }
        }
    });
}

function updateProductsChart(startDate, endDate) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    if (window.productsChart) window.productsChart.destroy();

    const productData = aggregateProductData(startDate, endDate);
    window.productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: productData.labels,
            datasets: [{
                label: 'Units Sold',
                data: productData.values,
                backgroundColor: 'rgba(33, 150, 243, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Product Sales Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity Sold'
                    }
                }
            }
        }
    });
}

function aggregateSalesData(startDate, endDate) {
    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
    });

    const salesByDate = filteredOrders.reduce((acc, order) => {
        const date = new Date(order.date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
    }, {});

    return {
        labels: Object.keys(salesByDate),
        values: Object.values(salesByDate)
    };
}

function aggregateProductData(startDate, endDate) {
    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
    });

    const productSales = filteredOrders.reduce((acc, order) => {
        order.items.forEach(item => {
            acc[item.title] = (acc[item.title] || 0) + item.quantity;
        });
        return acc;
    }, {});

    return {
        labels: Object.keys(productSales),
        values: Object.values(productSales)
    };
}