// ==================== FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyBm_eFEYlE-GOpSp8PzRvUzGPEl2pIsWz0",
    authDomain: "bliss-ffad9.firebaseapp.com",
    projectId: "bliss-ffad9",
    storageBucket: "bliss-ffad9.firebasestorage.app",
    messagingSenderId: "863864024902",
    appId: "1:863864024902:web:02cb9dd6997a0fa7353f47"
};

let auth, db;

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('✅ Firebase inicializado');
}

// ==================== CONSTANTES ====================
const SECTION_KEY = 'admin_products_section_1';

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (auth) {
        auth.onAuthStateChanged(user => {
            user ? showUserState(user) : showLoginState();
        });
    }

    initCatalogDropdown();

    
    loadAndRenderProducts();

    if (typeof cart !== 'undefined') {
        cart.updateCartUI();
        updateCartCount();
    }
});


// ==================== HEADER / AUTH ====================
async function showUserState(user) {
    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');

    if (loginState) loginState.style.display = 'none';
    if (userState) userState.style.display = 'block';

    let initial = user.email?.charAt(0).toUpperCase() || 'U';

    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().firstName) {
            initial = doc.data().firstName.charAt(0).toUpperCase();
        }
    } catch {}

    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initial;
}

function showLoginState() {
    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');

    if (loginState) loginState.style.display = 'block';
    if (userState) userState.style.display = 'none';
}

function handleLogout() {
    auth?.signOut().then(showLoginState);
}

// Inicializar dropdown del catálogo
function initCatalogDropdown() {
    const dropdown = document.getElementById('catalog-dropdown');
    const button = document.getElementById('catalog-btn');
    const menu = document.getElementById('catalog-menu');
    
    if (!dropdown || !button || !menu) return;
    
    let closeTimer = null;
    
    // Abrir dropdown
    function openDropdown() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        dropdown.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
    }
    
    // Cerrar dropdown
    function closeDropdown() {
        dropdown.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
    }
    
    // Mouse enter
    dropdown.addEventListener('mouseenter', openDropdown);
    
    // Mouse leave
    dropdown.addEventListener('mouseleave', function() {
        closeTimer = setTimeout(closeDropdown, 200);
    });
    
    // Click para móviles
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Cerrar al seleccionar una opción
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeDropdown);
    });
    
    // Soporte de teclado
    button.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDropdown();
            button.focus();
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isOpen = button.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        }
    });
}

// ==================== PRODUCTOS ====================
function loadProducts() {
    try {
        const data = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
        return data
            .filter(p => p.active !== false)
            .map(p => ({
                id: p.id,
                nombre: p.name || p.nombre,
                descripcion: p.features || p.descripcion || '',
                precio: Number(p.price || p.precio || 0),
                imagen: p.photo || p.imagen || ''
            }));
    } catch {
        return [];
    }
}

function loadAndRenderProducts() {
    const products = loadProducts();
    renderProducts(products);
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('empty');

    if (!grid) return;
    grid.innerHTML = '';

    if (!products.length) {
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    products.forEach(p => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.imagen}" class="product-image">
            <div class="product-body">
                <h3>${escapeHtml(p.nombre)}</h3>
                <p>${escapeHtml(p.descripcion)}</p>
                <div class="product-footer">
                    <strong>${formatPrice(p.precio)}</strong>
                    <button class="add-to-cart-btn" data-id="${p.id}">
                        <i class="fas fa-cart-plus"></i> Agregar
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==================== CARRITO ====================
document.addEventListener('click', e => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;

    const productId = btn.dataset.id;
    const product = loadProducts().find(p => p.id == productId);
    if (!product) return;

    cart.addProduct({
        id: product.id,
        name: product.nombre,
        price: product.precio,
        section: 1,
        image: product.imagen
    }, 1);

    updateCartCount();
    showToast('✓ Producto agregado');
});

function updateCartCount() {
    const count = cart?.getTotalItems() || 0;
    const el = document.getElementById('cart-count');
    if (el) {
        el.textContent = count;
        el.style.display = count ? 'inline-flex' : 'none';
    }
}

// ==================== UI HELPERS ====================

function formatPrice(v) {
    return v.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}
