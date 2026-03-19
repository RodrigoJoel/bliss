// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBm_eFEYlE-GOpSp8PzRvUzGPEl2pIsWz0",
    authDomain: "bliss-ffad9.firebaseapp.com",
    projectId: "bliss-ffad9",
    storageBucket: "bliss-ffad9.firebasestorage.app",
    messagingSenderId: "863864024902",
    appId: "1:863864024902:web:02cb9dd6997a0fa7353f47"
};

// Inicializar Firebase
let auth, db;
if (typeof firebase !== 'undefined') {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('✅ Firebase inicializado');
    } catch (error) {
        console.error('Error Firebase:', error);
    }
}

// FUNCIÓN DE FORMATEO
function formatPrice(value) {
    if (value === undefined || value === null) return '$0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0,00';
    
    return '$' + numValue.toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        .replace('.', ',');
}

// Verificar autenticación
document.addEventListener('DOMContentLoaded', () => {
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                showUserState(user);
            } else {
                showLoginState();
            }
        });
    }

    initCatalogDropdown();
    loadAndRenderProducts();
    updateCartCount();
    updateTotalCartCount();
});

// Inicializar dropdown del catálogo
function initCatalogDropdown() {
    const dropdown = document.getElementById('catalog-dropdown');
    const button = document.getElementById('catalog-btn');
    const menu = document.getElementById('catalog-menu');
    
    if (!dropdown || !button || !menu) return;
    
    let closeTimer = null;
    
    function openDropdown() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        dropdown.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
    }
    
    function closeDropdown() {
        dropdown.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
    }
    
    dropdown.addEventListener('mouseenter', openDropdown);
    
    dropdown.addEventListener('mouseleave', function() {
        closeTimer = setTimeout(closeDropdown, 200);
    });
    
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeDropdown);
    });
}

// Mostrar usuario logueado
async function showUserState(user) {

    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');
    
    if (loginState) loginState.style.display = 'none';
    if (userState) userState.style.display = 'block';
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        let initial = '';
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const firstName = (userData.firstName || '').trim();
            if (firstName) {
                initial = firstName.charAt(0).toUpperCase();
            }
        }
        
        if (!initial) {
            initial = user.email.charAt(0).toUpperCase();
        }
        
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) userAvatar.textContent = initial;

    } catch (error) {
        console.error('Error obteniendo datos usuario:', error);
    }
}

function showLoginState() {

    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');
    
    if (loginState) loginState.style.display = 'block';
    if (userState) userState.style.display = 'none';
}

function handleLogout() {
    if (auth) {
        auth.signOut();
    }
}

// Renderizar carrito
function renderCartPage() {

    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-message');
    const clearBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('go-to-checkout-btn');
    
    if (!cart.items || cart.items.length === 0) {
        emptyMsg.style.display = 'block';
        clearBtn.style.display = 'none';
        checkoutBtn.style.display = 'none';
        updateSummary(0);
        return;
    }
    
    emptyMsg.style.display = 'none';
    clearBtn.style.display = 'inline-block';
    checkoutBtn.style.display = 'block';
    
    container.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            
            <img src="${item.image || 'imagenes/default-product.jpg'}" class="item-image">

            <div class="item-details">
                <h4>${item.name}</h4>
                <p>${formatPrice(item.price)} c/u</p>
            </div>
            
            <div class="quantity-controls">
                <button onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity + 1})">+</button>
            </div>
            
            <div class="item-total">
                ${formatPrice(item.price * item.quantity)}
            </div>

        </div>
    `).join('');

    const subtotal = cart.getSubtotal();
    updateSummary(subtotal);
}

function changeQuantity(productId, sectionId, newQuantity) {
    cart.updateQuantity(productId, sectionId, newQuantity);
    renderCartPage();
}

function removeFromCart(productId, sectionId) {
    cart.removeProduct(productId, sectionId);
    renderCartPage();
}

document.addEventListener('DOMContentLoaded', function() {

    const clearCartBtn = document.getElementById('clear-cart-btn');

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function() {

            cart.clearCart();
            renderCartPage();

        });
    }

});

// ENVÍO DESACTIVADO (A coordinar)
function calculateShipping() {
    return 0;
}

// ACTUALIZAR RESUMEN
function updateSummary(subtotal) {

    document.getElementById('summary-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('summary-shipping').textContent = "A coordinar";
    document.getElementById('summary-total').textContent = formatPrice(subtotal);

}

// INICIALIZAR
document.addEventListener('DOMContentLoaded', function() {

    if (typeof cart === 'undefined') {
        console.error('Error carrito no cargado');
        return;
    }

    renderCartPage();

    document.getElementById('current-year').textContent = new Date().getFullYear();

});