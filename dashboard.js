import { 
    auth, 
    db, 
    signOut, 
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            console.log("User is signed in:", user);
            await loadUserData(user);
        } else {
            // User is not signed in, redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Load user data from Firestore
    async function loadUserData(user) {
        try {
            // Update user name and email in sidebar
            document.getElementById('user-name').textContent = user.displayName || 'Member';
            document.getElementById('user-email').textContent = user.email;

            // Get additional user data from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Update last login date
                const lastLogin = userData.lastLogin ? new Date(userData.lastLogin) : new Date();
                document.getElementById('last-login-date').textContent = formatDate(lastLogin);
                
                // Update profile form if on profile tab
                if (document.getElementById('first-name')) {
                    document.getElementById('first-name').value = userData.firstName || '';
                    document.getElementById('last-name').value = userData.lastName || '';
                    document.getElementById('phone').value = userData.phone || '';
                    document.getElementById('email').value = userData.email || '';
                }
                
                // Update last login time in Firestore
                await updateDoc(doc(db, "users", user.uid), {
                    lastLogin: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }

    // Format date for display
    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    }

    // Dashboard navigation
    const navLinks = document.querySelectorAll('.dashboard-nav a');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSection = this.getAttribute('data-section');
            
            // Update active nav link
            navLinks.forEach(navLink => {
                navLink.parentElement.classList.remove('active');
            });
            this.parentElement.classList.add('active');
            
            // Show target section
            dashboardSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
            
            // Update URL hash
            window.location.hash = targetSection;
        });
    });
    
    // Handle URL hash on page load
    function handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetLink = document.querySelector(`.dashboard-nav a[data-section="${hash}"]`);
            if (targetLink) {
                targetLink.click();
            }
        }
    }
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    
    // Profile tabs navigation
    const profileMenuItems = document.querySelectorAll('.profile-menu-item');
    const profileTabs = document.querySelectorAll('.profile-tab');
    
    if (profileMenuItems.length > 0) {
        profileMenuItems.forEach(item => {
            item.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Update active menu item
                profileMenuItems.forEach(menuItem => {
                    menuItem.classList.remove('active');
                });
                this.classList.add('active');
                
                // Show target tab
                profileTabs.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.id === `${targetTab}-tab`) {
                        tab.classList.add('active');
                    }
                });
            });
        });
    }
    
    // Calendar generation
    const calendarGrid = document.querySelector('.calendar-grid');
    
    if (calendarGrid) {
        generateCalendar();
    }
    
    function generateCalendar() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Clear existing calendar
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = i;
            
            // Highlight current day
            if (i === date.getDate()) {
                day.classList.add('current-day');
            }
            
            // Add event indicators (example)
            if (i === 18 || i === 24) {
                const eventIndicator = document.createElement('span');
                eventIndicator.className = 'event-indicator';
                day.appendChild(eventIndicator);
                day.classList.add('has-event');
                
                // Add event tooltip
                day.setAttribute('data-tooltip', i === 18 ? "Father's Day Special Service" : "Youth Summer Kickoff");
            }
            
            day.appendChild(dayNumber);
            calendarGrid.appendChild(day);
        }
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error signing out:", error);
                alert("Error signing out. Please try again.");
            }
        });
    }
    
    // Form submissions
    const profileForms = document.querySelectorAll('.profile-form');
    
    // Update notification preferences
    async function updateNotificationPreferences(user, preferences) {
        try {
            await updateDoc(doc(db, "users", user.uid), {
                notificationPreferences: preferences,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Error updating notification preferences:", error);
            throw error;
        }
    }

    // Handle form submissions
    profileForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formId = form.id;
            const user = auth.currentUser;

            if (!user) {
                alert("Please sign in to update your profile");
                return;
            }

            try {
                if (formId === 'profile-tab') {
                    const firstName = document.getElementById('first-name').value;
                    const lastName = document.getElementById('last-name').value;
                    const phone = document.getElementById('phone').value;
                    const address = document.getElementById('address').value;
                    
                    // Update user profile
                    await updateProfile(user, {
                        displayName: `${firstName} ${lastName}`
                    });
                    
                    // Update user data in Firestore
                    await updateDoc(doc(db, "users", user.uid), {
                        firstName,
                        lastName,
                        phone,
                        address,
                        updatedAt: new Date().toISOString()
                    });
                    
                    alert("Profile updated successfully!");
                } else if (formId === 'notifications-tab') {
                    const preferences = {
                        events: document.getElementById('notify-events').checked,
                        sermons: document.getElementById('notify-sermons').checked,
                        prayer: document.getElementById('notify-prayer').checked,
                        groups: document.getElementById('notify-groups').checked,
                        newsletter: document.getElementById('notify-newsletter').checked,
                        frequency: document.getElementById('notification-frequency').value
                    };
                    
                    await updateNotificationPreferences(user, preferences);
                    alert("Notification preferences updated successfully!");
                } else if (formId === 'security-tab') {
                    const currentPassword = document.getElementById('current-password').value;
                    const newPassword = document.getElementById('new-password').value;
                    const confirmPassword = document.getElementById('confirm-password').value;
                    
                    if (newPassword !== confirmPassword) {
                        alert("New passwords do not match.");
                        return;
                    }
                    
                    // Reauthenticate user and update password
                    try {
                        const credential = EmailAuthProvider.credential(user.email, currentPassword);
                        await reauthenticateWithCredential(user, credential);
                        await updatePassword(user, newPassword);
                        alert("Password updated successfully!");
                    } catch (error) {
                        console.error("Password update error:", error);
                        let errorMessage = "Error updating password. Please try again.";
                        
                        if (error.code === 'auth/wrong-password') {
                            errorMessage = "Current password is incorrect.";
                        } else if (error.code === 'auth/weak-password') {
                            errorMessage = "New password is too weak. Please use a stronger password.";
                        }
                        
                        alert(errorMessage);
                    }
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("An error occurred while updating your profile. Please try again.");
            }
        });
    });
    
    // Prayer request form
    const prayerForm = document.querySelector('.prayer-form');
    
    if (prayerForm) {
        prayerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const user = auth.currentUser;
            
            if (!user) {
                alert("You must be logged in to submit a prayer request.");
                return;
            }
            
            const prayerType = document.getElementById('prayer-type').value;
            const prayerRequest = document.getElementById('prayer-request').value;
            const isPrivate = document.getElementById('prayer-private').checked;
            const receiveUpdates = document.getElementById('prayer-updates').checked;
            
            try {
                // Add prayer request to Firestore
                await addDoc(collection(db, "prayerRequests"), {
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    type: prayerType,
                    request: prayerRequest,
                    isPrivate,
                    receiveUpdates,
                    status: 'in-progress',
                    prayerCount: 0,
                    createdAt: new Date().toISOString()
                });
                
                alert("Prayer request submitted successfully!");
                prayerForm.reset();
                
                // Reload prayer requests
                // This would be implemented in a real application
            } catch (error) {
                console.error("Prayer request error:", error);
                alert("Error submitting prayer request. Please try again.");
            }
        });
    }
});