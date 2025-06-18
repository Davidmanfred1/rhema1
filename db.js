// Local Storage Database Implementation
const DB = {
    // Initialize database tables
    init() {
        try {
            if (!localStorage.getItem('products')) {
                localStorage.setItem('products', JSON.stringify([]));
            }
            if (!localStorage.getItem('orders')) {
                localStorage.setItem('orders', JSON.stringify([]));
            }
            if (!localStorage.getItem('admins')) {
                // Initialize with empty admin array
                localStorage.setItem('admins', JSON.stringify([]));
            }
        } catch (error) {
            console.error('Error initializing database:', error);
            throw new Error('Failed to initialize database');
        }
    },

    // Product operations
    getProducts() {
        try {
            return JSON.parse(localStorage.getItem('products')) || [];
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    },

    addProduct(product) {
        try {
            const products = this.getProducts();
            products.push(product);
            localStorage.setItem('products', JSON.stringify(products));
            return true;
        } catch (error) {
            console.error('Error adding product:', error);
            return false;
        }
    },

    updateProduct(productId, updatedProduct) {
        try {
            const products = this.getProducts();
            const index = products.findIndex(p => p.id === productId);
            if (index !== -1) {
                products[index] = { ...products[index], ...updatedProduct };
                localStorage.setItem('products', JSON.stringify(products));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating product:', error);
            return false;
        }
    },

    deleteProduct(productId) {
        try {
            const products = this.getProducts();
            const filteredProducts = products.filter(p => p.id !== productId);
            localStorage.setItem('products', JSON.stringify(filteredProducts));
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            return false;
        }
    },

    // Order operations
    getOrders() {
        try {
            return JSON.parse(localStorage.getItem('orders')) || [];
        } catch (error) {
            console.error('Error getting orders:', error);
            return [];
        }
    },

    addOrder(order) {
        try {
            const orders = this.getOrders();
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));
            return true;
        } catch (error) {
            console.error('Error adding order:', error);
            return false;
        }
    },

    updateOrderStatus(orderId, status) {
        try {
            const orders = this.getOrders();
            const order = orders.find(o => o.id === orderId);
            if (order) {
                order.status = status;
                localStorage.setItem('orders', JSON.stringify(orders));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating order status:', error);
            return false;
        }
    },

    // Admin operations
    getAdmins() {
        try {
            return JSON.parse(localStorage.getItem('admins')) || [];
        } catch (error) {
            console.error('Error getting admins:', error);
            return [];
        }
    },

    validateAdmin(username, hashedPassword) {
        try {
            const admins = this.getAdmins();
            return admins.find(a => a.username === username && a.password === hashedPassword);
        } catch (error) {
            console.error('Error validating admin:', error);
            return null;
        }
    },

    addAdmin(admin) {
        try {
            const admins = this.getAdmins();
            if (!admins.find(a => a.username === admin.username)) {
                // Ensure password is hashed before storing
                if (!admin.password.startsWith('$2')) {
                    throw new Error('Password must be hashed before storing');
                }
                admins.push(admin);
                localStorage.setItem('admins', JSON.stringify(admins));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding admin:', error);
            return false;
        }
    },

    updateAdminSettings(username, updates) {
        try {
            const admins = this.getAdmins();
            const admin = admins.find(a => a.username === username);
            if (admin) {
                // Don't allow password updates through this method
                const { password, ...safeUpdates } = updates;
                Object.assign(admin, safeUpdates);
                localStorage.setItem('admins', JSON.stringify(admins));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating admin settings:', error);
            return false;
        }
    },

    // Analytics operations
    getAnalytics(startDate, endDate) {
        const orders = this.getOrders();
        const filteredOrders = startDate && endDate
            ? orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
            })
            : orders;

        return {
            totalSales: filteredOrders.reduce((sum, order) => sum + order.total, 0),
            totalOrders: filteredOrders.length,
            productsSold: filteredOrders.reduce((sum, order) => sum + order.items.length, 0)
        };
    }
};