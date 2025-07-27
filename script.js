const FIREBASE_URL = 'https://travaling-76f20-default-rtdb.firebaseio.com';
let currentFilter = 'all';
let packages = [];
let lastUpdateTime = 0;
let updateInterval = null;

// No sample data - start with empty packages

// Load packages on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPackages();
    setupEventListeners();
    setupScrollAnimations();
    setupParallaxEffect();
    setupMobileNavigation();
    startRealTimeUpdates();
    
    // Debug navigation
    console.log('Contact link found:', document.querySelector('a[href="contact.html"]'));
    
    // Add search functionality - only if search input exists
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPackages();
            }
        });
    }
});

// Real-time update functionality
function startRealTimeUpdates() {
    // Check for updates every 5 seconds
    updateInterval = setInterval(async () => {
        try {
            const response = await fetch(`${FIREBASE_URL}/packages.json`);
            const data = await response.json();
            
            if (data && Object.keys(data).length > 0) {
                const newPackages = Object.values(data);
                const currentPackageCount = packages.length;
                const newPackageCount = newPackages.length;
                
                // Check if packages have changed
                if (currentPackageCount !== newPackageCount || 
                    JSON.stringify(packages.map(p => p._id).sort()) !== 
                    JSON.stringify(newPackages.map(p => p._id).sort())) {
                    
                    console.log('Packages updated - refreshing display');
                    packages = newPackages;
                    displayPackages();
                    
                    // Show notification for new packages
                    if (newPackageCount > currentPackageCount) {
                        showUpdateNotification(newPackageCount - currentPackageCount);
                    }
                }
            } else if (packages.length > 0) {
                // All packages were deleted
                packages = [];
                displayPackages();
                showUpdateNotification(-packages.length);
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }, 5000); // Check every 5 seconds
}

// Show notification when new packages are added
function showUpdateNotification(newPackageCount) {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    if (newPackageCount > 0) {
        notification.innerHTML = `
            <strong>🆕 New Packages Available!</strong><br>
            ${newPackageCount} new package${newPackageCount > 1 ? 's' : ''} added.
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; float: right; cursor: pointer; font-size: 18px;">×</button>
        `;
    } else {
        notification.innerHTML = `
            <strong>📝 Packages Updated!</strong><br>
            Package information has been updated.
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; float: right; cursor: pointer; font-size: 18px;">×</button>
        `;
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

function setupEventListeners() {
    // Filter badges - only for badges with data-filter attribute on the homepage
    document.querySelectorAll('.badge[onclick], .filter-badges .badge').forEach(badge => {
        // These are handled by their onclick attributes, no additional event listeners needed
    });

    // Modal close - only if modal exists
    const modalClose = document.querySelector('.close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) {
        window.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                closeModal();
            }
        });
    }

    // Form submission - only if form exists
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
    
    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const phoneNumber = formData.get('phone');
            
            // Validate mobile number
            if (!/^\d{10}$/.test(phoneNumber)) {
                alert('Please enter a valid 10-digit mobile number');
                return;
            }
            
            // If validation passes, show success message
            alert('Thank you for your message! We will get back to you soon.');
            e.target.reset();
        });
    }
    
    // Mobile number validation for booking form
    const mobileInput = document.getElementById('mobile');
    if (mobileInput) {
        // Only allow numbers
        mobileInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Show validation message
            const isValid = e.target.value.length === 10;
            e.target.style.borderColor = e.target.value.length === 0 ? '#e9ecef' : 
                                       isValid ? '#28a745' : '#dc3545';
        });
        
        // Prevent non-numeric input
        mobileInput.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }
    
    // Mobile number validation for contact form
    const contactPhoneInput = document.getElementById('contact-phone');
    if (contactPhoneInput) {
        // Only allow numbers
        contactPhoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Show validation message
            const isValid = e.target.value.length === 10;
            e.target.style.borderColor = e.target.value.length === 0 ? '#e9ecef' : 
                                       isValid ? '#28a745' : '#dc3545';
        });
        
        // Prevent non-numeric input
        contactPhoneInput.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }
}

async function loadPackages() {
    showLoader();
    try {
        const response = await fetch(`${FIREBASE_URL}/packages.json`);
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
            packages = Object.values(data);
        } else {
            packages = [];
        }
        
        hideLoader();
        displayPackages();
    } catch (error) {
        console.error('Error loading packages:', error);
        packages = [];
        hideLoader();
        displayPackages();
    }
}

function showLoader() {
    const loader = document.getElementById('loader');
    const packagesContainer = document.getElementById('packages-container');
    
    if (loader) {
        loader.style.display = 'flex';
    }
    if (packagesContainer) {
        packagesContainer.style.display = 'none';
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    const packagesContainer = document.getElementById('packages-container');
    
    if (loader) {
        loader.style.display = 'none';
    }
    if (packagesContainer) {
        packagesContainer.style.display = 'grid';
    }
}


function openBookingModal(packageId, packageName) {
    const packageIdInput = document.getElementById('package-id');
    const packageNameInput = document.getElementById('package-name');
    const bookingModal = document.getElementById('booking-modal');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (packageIdInput) {
        packageIdInput.value = packageId;
    }
    if (packageNameInput) {
        packageNameInput.value = packageName;
    }
    if (bookingModal) {
        bookingModal.style.display = 'block';
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    if (startDateInput) {
        startDateInput.min = today;
    }
    if (endDateInput) {
        endDateInput.min = today;
    }
}

function sendWhatsAppMessage(packageName) {
    const phoneNumber = '918099996622';
    
    let message;
    if (packageName === 'general inquiry') {
        message = `Hi! I'm interested in your travel services. Could you please help me with booking and provide more information about your packages?`;
    } else {
        message = `Hi! I'm interested in booking the "${packageName}" package. Could you please provide more details and help me with the booking process?`;
    }
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function sendWhatsAppWithMessage(message) {
    const phoneNumber = '918099996622';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function closeModal() {
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    
    if (bookingModal) {
        bookingModal.style.display = 'none';
    }
    if (bookingForm) {
        bookingForm.reset();
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Validate mobile number
    const mobileNumber = formData.get('mobileNumber');
    if (!/^\d{10}$/.test(mobileNumber)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }
    const bookingData = {
        id: 'booking_' + Date.now(),
        packageId: formData.get('packageId'),
        packageName: formData.get('packageName'),
        customerName: formData.get('customerName'),
        mobileNumber: formData.get('mobileNumber'),
        email: formData.get('email'),
        numberOfPersons: parseInt(formData.get('numberOfPersons')),
        preferredDates: {
            start: formData.get('startDate'),
            end: formData.get('endDate')
        },
        additionalNotes: formData.get('additionalNotes'),
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
    };

    try {
        const response = await fetch(`${FIREBASE_URL}/bookings/${bookingData.id}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            closeModal();
            
            // Send WhatsApp message with booking details
            const packageName = formData.get('packageName');
            const customerName = formData.get('customerName');
            const mobileNumber = formData.get('mobileNumber');
            const startDate = formData.get('startDate');
            const numberOfPersons = formData.get('numberOfPersons');
            
            const whatsappMessage = `Hi! I've submitted a booking request for "${packageName}".
            
Details:
- Name: ${customerName}
- Mobile: ${mobileNumber}
- Package: ${packageName}
- Start Date: ${startDate}
- Number of Persons: ${numberOfPersons}

Please confirm my booking. Thank you!`;
            
            sendWhatsAppWithMessage(whatsappMessage);
            showSuccessMessage();
        } else {
            alert('Error submitting booking. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        alert('Error submitting booking. Please try again.');
    }
}

function showSuccessMessage() {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.style.display = 'block';
    }
}

function closeSuccess() {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.style.display = 'none';
    }
}

// Scroll-triggered animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    // Observe all scroll-reveal elements
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// Parallax scrolling effect
function setupParallaxEffect() {
    const parallaxElements = document.querySelectorAll('.parallax');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.3;
        
        parallaxElements.forEach(element => {
            element.style.transform = `translateY(${rate}px)`;
        });
    });
}

// Enhanced package display with staggered animations
function displayPackages() {
    const container = document.getElementById('packages-container');
    
    // If container doesn't exist (e.g., on service pages), don't proceed
    if (!container) {
        return;
    }
    
    // Debug info
    console.log('Current filter:', currentFilter);
    console.log('Total packages:', packages.length);
    console.log('Package types:', packages.map(p => p.type));
    
    const filteredPackages = currentFilter === 'all' 
        ? packages 
        : packages.filter(pkg => pkg.type === currentFilter);

    console.log('Filtered packages:', filteredPackages.length);

    if (filteredPackages.length === 0) {
        if (packages.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3>No packages available</h3>
                    <p>Please add packages through the admin dashboard first.</p>
                    <a href="login.html" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Go to Admin</a>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p>No packages available in "${currentFilter}" category.</p>
                    <p>Available categories: ${[...new Set(packages.map(p => p.type))].join(', ')}</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = filteredPackages.map((pkg, index) => `
        <div class="package-card stagger-item" style="animation-delay: ${index * 0.1}s" data-package-id="${pkg._id}">
            <img src="${pkg.imageUrl}" alt="${pkg.name}" class="package-image">
            <div class="package-content">
                <span class="package-type ${pkg.type}">${pkg.type.toUpperCase()}</span>
                <h3 class="package-title">${pkg.name}</h3>
                <p class="package-description">${pkg.description}</p>
                ${pkg.location ? `<p><strong>Location:</strong> ${pkg.location}</p>` : ''}
                ${pkg.duration ? `<p><strong>Duration:</strong> ${pkg.duration}</p>` : ''}
                <div class="package-price">₹${pkg.price.toLocaleString()}</div>
                <button class="btn-primary" onclick="openBookingModal('${pkg._id}', '${pkg.name}')">
                    Book Now
                </button>
            </div>
        </div>
    `).join('');
    
    // Add update animation to new packages
    setTimeout(() => {
        document.querySelectorAll('.stagger-item').forEach(item => {
            item.classList.add('animate-in');
        });
    }, 100);
}

// Search functionality
function searchPackages() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        displayPackages();
        return;
    }
    
    const filteredPackages = packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm) ||
        pkg.description.toLowerCase().includes(searchTerm) ||
        pkg.location?.toLowerCase().includes(searchTerm) ||
        pkg.type.toLowerCase().includes(searchTerm)
    );
    
    const container = document.getElementById('packages-container');
    if (!container) return;
    
    if (filteredPackages.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="font-size: 1.2rem; color: #666;">No packages found for "${searchTerm}"</p>
                <button class="btn-primary" onclick="clearSearch()" style="margin-top: 1rem;">Clear Search</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredPackages.map((pkg, index) => `
        <div class="package-card stagger-item" style="animation-delay: ${index * 0.1}s">
            <img src="${pkg.imageUrl}" alt="${pkg.name}" class="package-image">
            <div class="package-content">
                <span class="package-type ${pkg.type}">${pkg.type.toUpperCase()}</span>
                <h3 class="package-title">${pkg.name}</h3>
                <p class="package-description">${pkg.description}</p>
                ${pkg.location ? `<p><strong>Location:</strong> ${pkg.location}</p>` : ''}
                ${pkg.duration ? `<p><strong>Duration:</strong> ${pkg.duration}</p>` : ''}
                <div class="package-price">₹${pkg.price.toLocaleString()}</div>
                <button class="btn-primary" onclick="openBookingModal('${pkg._id}', '${pkg.name}')">
                    Book Now
                </button>
            </div>
        </div>
    `).join('');
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    displayPackages();
}

// Filter by badge
function filterByBadge(type) {
    currentFilter = type;
    
    // Update active badge
    document.querySelectorAll('.badge').forEach(badge => {
        badge.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update nav links too
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.filter === type) {
            link.classList.add('active');
        }
    });
    
    displayPackages();
}

// Mobile Navigation Setup
function setupMobileNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                // Don't prevent navigation to other pages
                if (!link.getAttribute('data-filter') && link.getAttribute('href') !== '#') {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    // Let the link navigate normally
                    return;
                }
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Navbar scroll effect
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        lastScrollY = window.scrollY;
    });
    
    // Prevent dropdown parent from navigating
    document.querySelectorAll('.nav-dropdown > .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });
}

// Show real-time indicator
function showRealTimeIndicator() {
    // Remove existing indicator
    const existingIndicator = document.querySelector('.real-time-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'real-time-indicator';
    indicator.innerHTML = `
        <span style="display: inline-block; width: 8px; height: 8px; background: #fff; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite;"></span>
        Live Updates Active
    `;
    
    document.body.appendChild(indicator);
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}