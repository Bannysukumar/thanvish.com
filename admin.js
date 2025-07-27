const FIREBASE_URL = 'https://travaling-76f20-default-rtdb.firebaseio.com';
let adminPassword = localStorage.getItem('adminPassword');
let currentPackageFilter = 'all';
let packages = [];
let bookings = [];

// Check authentication (simple password check)
if (!adminPassword || adminPassword !== 'admin123') {
    window.location.href = 'login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    testFirebaseConnection();
    loadPackages();
    loadBookings();
    setupEventListeners();
    setupHeaderLogout();
});

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        const response = await fetch(`${FIREBASE_URL}/.json`);
        console.log('Firebase connection test:', response.status);
        
        if (response.status === 404) {
            console.error('Firebase database not found. Please check:');
            console.error('1. Database is created in Firebase Console');
            console.error('2. Project ID is correct: travaling-76f20');
            console.error('3. Using Realtime Database (not Firestore)');
            
            // Show user-friendly message
            showFirebaseError();
        } else if (response.ok) {
            console.log('Firebase connection successful');
        } else {
            console.error('Firebase connection failed:', response.status);
        }
    } catch (error) {
        console.error('Firebase connection error:', error);
    }
}

// Show Firebase error message to user
function showFirebaseError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #f5c6cb;
        max-width: 400px;
        z-index: 1000;
    `;
    errorDiv.innerHTML = `
        <strong>Firebase Connection Failed</strong><br>
        The database might not be set up correctly. Please check:
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Realtime Database is created</li>
            <li>Database rules allow read/write</li>
            <li>Project ID is correct</li>
        </ul>
        <button onclick="this.parentElement.remove()" style="background: #721c24; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Close</button>
    `;
    document.body.appendChild(errorDiv);
}

function setupEventListeners() {
    // Section navigation
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.id === 'logout') {
                logout();
                return;
            }
            const section = link.dataset.section;
            showSection(section);
        });
    });

    // Package filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentPackageFilter = btn.dataset.type;
            displayPackages();
        });
    });

    // Modal
    document.querySelector('.close').addEventListener('click', closePackageModal);
    document.getElementById('package-form').addEventListener('submit', handlePackageSubmit);
}

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
    
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
}

async function loadPackages() {
    try {
        const response = await fetch(`${FIREBASE_URL}/packages.json`);
        
        // Handle 404 (empty database) as normal
        if (response.status === 404) {
            packages = [];
            displayPackages();
            return;
        }
        
        const data = await response.json();
        
        if (data && typeof data === 'object') {
            packages = Object.entries(data).map(([key, value]) => ({
                ...value,
                _id: key
            }));
        } else {
            packages = [];
        }
        
        displayPackages();
    } catch (error) {
        console.log('Firebase database is empty or unavailable');
        packages = [];
        displayPackages();
    }
}

function displayPackages() {
    const filteredPackages = currentPackageFilter === 'all'
        ? packages
        : packages.filter(pkg => pkg.type === currentPackageFilter);

    const container = document.getElementById('packages-list');
    
    if (filteredPackages.length === 0) {
        if (packages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <h3>No packages yet</h3>
                    <p>Start by adding your first travel package!</p>
                    <button onclick="showAddPackageForm()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Add First Package</button>
                </div>
            `;
        } else {
            container.innerHTML = '<p>No packages found for the selected filter.</p>';
        }
        return;
    }

    container.innerHTML = filteredPackages.map(pkg => `
        <div class="package-item">
            <div class="package-header">
                <div>
                    <h3>${pkg.name || 'Unnamed Package'}</h3>
                    <span class="package-type-badge ${pkg.type || 'other'}">${(pkg.type || 'other').toUpperCase()}</span>
                </div>
                <div class="package-actions">
                    <button class="btn-edit" onclick="editPackage('${pkg._id}')">Edit</button>
                    <button class="btn-delete" onclick="deletePackage('${pkg._id}')">Delete</button>
                </div>
            </div>
            <p>${pkg.description || 'No description'}</p>
            <p><strong>Price:</strong> ₹${(pkg.price || 0).toLocaleString()}</p>
            ${pkg.location ? `<p><strong>Location:</strong> ${pkg.location}</p>` : ''}
            ${pkg.duration ? `<p><strong>Duration:</strong> ${pkg.duration}</p>` : ''}
        </div>
    `).join('');
}

async function loadBookings() {
    try {
        // Load travel bookings
        const travelResponse = await fetch(`${FIREBASE_URL}/bookings.json`);
        let travelBookings = [];
        
        if (travelResponse.ok) {
            const travelData = await travelResponse.json();
            if (travelData && typeof travelData === 'object') {
                travelBookings = Object.entries(travelData).map(([key, value]) => ({
                    ...value,
                    _id: key,
                    type: 'travel'
                }));
            }
        }

        // Load cab bookings
        const cabResponse = await fetch(`${FIREBASE_URL}/cab-bookings.json`);
        let cabBookings = [];
        
        if (cabResponse.ok) {
            const cabData = await cabResponse.json();
            if (cabData && typeof cabData === 'object') {
                cabBookings = Object.entries(cabData).map(([key, value]) => ({
                    ...value,
                    _id: key,
                    type: 'cab'
                }));
            }
        }

        // Load food bookings
        const foodResponse = await fetch(`${FIREBASE_URL}/food-orders.json`);
        let foodBookings = [];
        
        if (foodResponse.ok) {
            const foodData = await foodResponse.json();
            if (foodData && typeof foodData === 'object') {
                foodBookings = Object.entries(foodData).map(([key, value]) => ({
                    ...value,
                    _id: key,
                    type: 'food'
                }));
            }
        }

        // Combine all bookings
        bookings = [...travelBookings, ...cabBookings, ...foodBookings];
        
        // Sort by timestamp (newest first)
        bookings.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt || a.bookingDate || 0).getTime();
            const timeB = new Date(b.timestamp || b.createdAt || b.bookingDate || 0).getTime();
            return timeB - timeA;
        });
        
        displayBookings();
    } catch (error) {
        console.log('Error loading bookings:', error);
        bookings = [];
        displayBookings();
    }
}

// Helper function to convert Firebase timestamp to Date
function formatFirebaseDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    // Handle Firebase Timestamp object
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleString();
    }
    
    // Handle regular date string
    if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString();
    }
    
    // Handle milliseconds timestamp
    if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleString();
    }
    
    return 'Invalid Date';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}

function displayBookings() {
    const container = document.getElementById('bookings-list');
    
    if (bookings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <h3>No bookings yet</h3>
                <p>Bookings will appear here when customers make reservations.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => {
        let bookingType = booking.type || 'travel';
        let serviceName = '';
        let additionalInfo = '';
        
        // Determine service name and additional info based on booking type
        switch (bookingType) {
            case 'travel':
                serviceName = booking.packageName || 'Travel Package';
                additionalInfo = `
                    <p><strong>Persons:</strong> ${booking.numberOfPersons || 1}</p>
                    <p><strong>Start Date:</strong> ${formatDate(booking.startDate)}</p>
                    ${booking.endDate ? `<p><strong>End Date:</strong> ${formatDate(booking.endDate)}</p>` : ''}
                `;
                break;
            case 'cab':
                serviceName = booking.cabName || 'Cab Service';
                additionalInfo = `
                    <p><strong>Pickup:</strong> ${booking.pickupLocation || 'N/A'}</p>
                    <p><strong>Destination:</strong> ${booking.destination || 'N/A'}</p>
                    <p><strong>Travel Date:</strong> ${formatDate(booking.travelDate)}</p>
                    <p><strong>Travel Time:</strong> ${booking.travelTime || 'N/A'}</p>
                    <p><strong>Passengers:</strong> ${booking.passengers || 1}</p>
                `;
                break;
            case 'food':
                serviceName = booking.restaurantName || 'Food Order';
                additionalInfo = `
                    <p><strong>Delivery Address:</strong> ${booking.deliveryAddress || 'N/A'}</p>
                    <p><strong>Order Items:</strong> ${booking.orderItems || 'N/A'}</p>
                    ${booking.deliveryTime ? `<p><strong>Delivery Time:</strong> ${booking.deliveryTime}</p>` : ''}
                    ${booking.specialInstructions ? `<p><strong>Special Instructions:</strong> ${booking.specialInstructions}</p>` : ''}
                `;
                break;
        }

        return `
            <div class="booking-item">
                <div class="booking-header">
                    <div>
                        <h3>${booking.customerName || 'Unknown Customer'}</h3>
                        <span class="booking-status ${booking.status || 'pending'}">${(booking.status || 'pending').toUpperCase()}</span>
                        <span class="booking-type ${bookingType}">${bookingType.toUpperCase()}</span>
                    </div>
                    <div>
                        <select onchange="updateBookingStatus('${booking._id}', this.value, '${bookingType}')">
                            <option value="pending" ${(booking.status || 'pending') === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Mobile:</strong> ${booking.mobileNumber || 'N/A'}</p>
                ${booking.email ? `<p><strong>Email:</strong> ${booking.email}</p>` : ''}
                ${additionalInfo}
                ${booking.additionalNotes ? `<p><strong>Notes:</strong> ${booking.additionalNotes}</p>` : ''}
                <p><small>Booked on: ${formatFirebaseDate(booking.timestamp || booking.createdAt || booking.bookingDate)}</small></p>
            </div>
        `;
    }).join('');
}

function showAddPackageForm() {
    document.getElementById('modal-title').textContent = 'Add New Package';
    document.getElementById('package-form').reset();
    document.getElementById('package-id').value = '';
    document.getElementById('package-modal').style.display = 'block';
}

function editPackage(id) {
    const pkg = packages.find(p => p._id === id);
    if (!pkg) return;

    document.getElementById('modal-title').textContent = 'Edit Package';
    document.getElementById('package-id').value = pkg._id;
    document.getElementById('package-name').value = pkg.name;
    document.getElementById('package-type').value = pkg.type;
    document.getElementById('package-description').value = pkg.description;
    document.getElementById('package-price').value = pkg.price;
    document.getElementById('package-location').value = pkg.location || '';
    document.getElementById('package-duration').value = pkg.duration || '';
    document.getElementById('package-image').value = pkg.imageUrl || '';
    document.getElementById('package-highlights').value = pkg.highlights ? pkg.highlights.join(', ') : '';
    
    document.getElementById('package-modal').style.display = 'block';
}

function closePackageModal() {
    document.getElementById('package-modal').style.display = 'none';
    document.getElementById('package-form').reset();
}

async function handlePackageSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const packageId = document.getElementById('package-id').value;
    
    const packageData = {
        name: formData.get('name'),
        type: formData.get('type'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        location: formData.get('location'),
        duration: formData.get('duration'),
        imageUrl: formData.get('imageUrl') || 'https://via.placeholder.com/400x300',
        highlights: formData.get('highlights') ? formData.get('highlights').split(',').map(h => h.trim()) : [],
        updatedAt: new Date().toISOString(),
        createdAt: packageId ? undefined : new Date().toISOString() // Only set for new packages
    };

    try {
        let response;
        let newPackageId;
        
        if (packageId) {
            // Update existing package
            response = await fetch(`${FIREBASE_URL}/packages/${packageId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        } else {
            // Create new package using POST to auto-generate ID
            response = await fetch(`${FIREBASE_URL}/packages.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
            
            if (response.ok) {
                const result = await response.json();
                newPackageId = result.name; // Firebase returns the new ID in 'name' field
            }
        }

        if (response.ok) {
            closePackageModal();
            loadPackages();
            
            // Show success message with package details
            const action = packageId ? 'updated' : 'added';
            const packageType = packageData.type.charAt(0).toUpperCase() + packageData.type.slice(1);
            
            const successMessage = `
                ✅ Package ${action} successfully!
                
                📦 Package: ${packageData.name}
                🏷️ Type: ${packageType}
                💰 Price: ₹${packageData.price.toLocaleString()}
                📍 Location: ${packageData.location || 'Not specified'}
                
                The package is now live on the user panel and will be visible to customers immediately.
            `;
            
            alert(successMessage);
            
            // Log for debugging
            console.log(`Package ${action}:`, {
                id: newPackageId || packageId,
                name: packageData.name,
                type: packageData.type,
                timestamp: new Date().toISOString()
            });
            
        } else {
            const errorText = await response.text();
            console.error('Firebase error:', response.status, errorText);
            alert(`Error saving package: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error saving package:', error);
        alert('Error saving package. Check your internet connection and try again.');
    }
}

async function deletePackage(id) {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
        const response = await fetch(`${FIREBASE_URL}/packages/${id}.json`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadPackages();
            alert('Package deleted successfully!');
        } else {
            alert('Error deleting package. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting package:', error);
        alert('Error deleting package. Please try again.');
    }
}

async function updateBookingStatus(id, status, bookingType) {
    try {
        let firebasePath = '';
        
        // Determine the correct Firebase path based on booking type
        switch (bookingType) {
            case 'travel':
                firebasePath = `${FIREBASE_URL}/bookings/${id}/status.json`;
                break;
            case 'cab':
                firebasePath = `${FIREBASE_URL}/cab-bookings/${id}/status.json`;
                break;
            case 'food':
                firebasePath = `${FIREBASE_URL}/food-orders/${id}/status.json`;
                break;
            default:
                firebasePath = `${FIREBASE_URL}/bookings/${id}/status.json`;
        }
        
        const response = await fetch(firebasePath, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(status)
        });

        if (response.ok) {
            // Update the local booking status
            const booking = bookings.find(b => b._id === id);
            if (booking) {
                booking.status = status;
            }
            
            // Show success message
            alert('Booking status updated successfully!');
        } else {
            alert('Failed to update booking status. Please try again.');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        alert('Error updating booking status. Please try again.');
    }
}

function logout() {
    localStorage.removeItem('adminPassword');
    window.location.href = 'login.html';
}

function setupHeaderLogout() {
    const headerLogout = document.getElementById('header-logout');
    if (headerLogout) {
        headerLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}