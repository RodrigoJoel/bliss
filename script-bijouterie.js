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

// Variables globales
const SECTION_KEY = 'admin_products_section_3'; // Cambiado para bijouterie
const CART_KEY = 'carrito';

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
    
    // Inicializar dropdown del catálogo
    initCatalogDropdown();
    
    // Cargar productos
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

// Mostrar estado de usuario logueado (SOLO INICIAL)
async function showUserState(user) {
    console.log('🔐 Usuario logueado:', user.email);
    
    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');
    
    if (loginState) loginState.style.display = 'none';
    if (userState) {
        userState.style.display = 'block';
        // Suavizar transición
        requestAnimationFrame(() => {
            userState.style.opacity = '1';
            userState.style.transition = 'opacity 0.3s ease';
        });
    }
    
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
            // Fallback a la inicial del email
            initial = (user.email && user.email.charAt(0)) ? user.email.charAt(0).toUpperCase() : 'U';
        }
        
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.textContent = initial;
            // Suavizar cambio
            requestAnimationFrame(() => {
                userAvatar.style.opacity = '1';
                userAvatar.style.transition = 'opacity 0.3s ease';
            });
        }
    } catch (error) {
        console.error('Error obteniendo datos usuario:', error);
        const fallback = (user.email && user.email.charAt(0)) ? user.email.charAt(0).toUpperCase() : 'U';
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) userAvatar.textContent = fallback;
    }
}

// Mostrar estado de login
function showLoginState() {
    console.log('👤 Usuario no logueado');
    
    const loginState = document.getElementById('loginState');
    const userState = document.getElementById('userState');
    
    if (loginState) {
        loginState.style.display = 'block';
        requestAnimationFrame(() => {
            loginState.style.opacity = '1';
            loginState.style.transition = 'opacity 0.3s ease';
        });
    }
    if (userState) {
        userState.style.display = 'none';
        userState.style.opacity = '0';
    }
}

// Manejar logout
function handleLogout() {
    if (auth) {
        auth.signOut().then(() => {
            console.log('✅ Sesión cerrada');
            showLoginState();
        }).catch((error) => {
            console.error('Error cerrando sesión:', error);
        });
    }
}

// ========== LÓGICA DE PRODUCTOS ==========

// Cargar productos
function loadProducts() {
    try {
        const rawData = localStorage.getItem(SECTION_KEY);
        if (!rawData) return [];
        
        const products = JSON.parse(rawData);
        if (!Array.isArray(products)) return [];
        
        return products.map(item => ({
            id: item.id || Date.now() + Math.random(),
            nombre: item.name || item.nombre || 'Sin nombre',
            descripcion: item.features || item.descripcion || 'Sin descripción',
            precio: parseFloat(item.price || item.precio || 0),
            imagen: item.photo || item.imagen || '',
            activo: item.active !== false
        })).filter(item => item.activo);
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
}

// Renderizar productos
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('empty');
    
    grid.innerHTML = '';
    
    if (!products || products.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    products.forEach(product => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <img class="product-image" 
                 src="${escapeAttr(product.imagen)}" 
                 alt="${escapeAttr(product.nombre)}"
                 onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 200\"><rect width=\"100%\" height=\"100%\" fill=\"%23f0f4ff\"/><text x=\"50%\" y=\"50%\" font-family=\"Montserrat\" font-size=\"14\" fill=\"%2394a3b8\" text-anchor=\"middle\" dy=\".3em\">Sin imagen</text></svg>'">
            
            <div class="product-body">
                <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
                <p class="product-description">${escapeHtml(product.descripcion)}</p>
                
                <div class="product-footer">
                    <div>
                        <div class="product-price">${formatPrice(product.precio)}</div>
                        <div class="product-id">ID: ${escapeHtml(product.id.toString().substring(0, 6))}</div>
                    </div>
                    
                    <div class="cart-actions">
                        <div class="quantity-picker" data-id="${escapeAttr(product.id)}">
                            <button class="quantity-btn dec" type="button">-</button>
                            <input type="number" min="1" value="1" class="quantity-input">
                            <button class="quantity-btn inc" type="button">+</button>
                            <button class="confirm-add-btn" type="button">Añadir</button>
                        </div>
                        <button class="add-to-cart-btn" data-id="${escapeAttr(product.id)}" type="button">
                            <i class="fas fa-cart-plus"></i>
                            Agregar
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    // Botón "Agregar"
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-cart-btn')) {
            const btn = e.target.closest('.add-to-cart-btn');
            const productId = btn.getAttribute('data-id');
            
            // Ocultar todos los selectores de cantidad
            document.querySelectorAll('.quantity-picker').forEach(q => {
                q.style.display = 'none';
            });
            
            // Mostrar el selector correspondiente
            const picker = document.querySelector(`.quantity-picker[data-id="${CSS.escape(productId)}"]`);
            if (picker) {
                picker.style.display = 'flex';
                const input = picker.querySelector('.quantity-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }
        }
    });

    // Incrementar cantidad
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('inc')) {
            const input = e.target.closest('.quantity-picker').querySelector('.quantity-input');
            input.value = parseInt(input.value || 1) + 1;
        }
    });

    // Decrementar cantidad
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('dec')) {
            const input = e.target.closest('.quantity-picker').querySelector('.quantity-input');
            const currentValue = parseInt(input.value || 1);
            input.value = Math.max(1, currentValue - 1);
        }
    });

    // Confirmar añadir
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('confirm-add-btn')) {
            const picker = e.target.closest('.quantity-picker');
            const productId = picker.getAttribute('data-id');
            const input = picker.querySelector('.quantity-input');
            const quantity = Math.max(1, parseInt(input.value) || 1);
            
            addToCart(productId, quantity);
            picker.style.display = 'none';
            showToast('✓ Producto añadido al carrito');
        }
    });

    // Enter para confirmar
    document.addEventListener('keypress', function(e) {
        if (e.target.classList.contains('quantity-input') && e.key === 'Enter') {
            const picker = e.target.closest('.quantity-picker');
            const productId = picker.getAttribute('data-id');
            const quantity = Math.max(1, parseInt(e.target.value) || 1);
            
            addToCart(productId, quantity);
            picker.style.display = 'none';
            showToast('✓ Producto añadido al carrito');
            e.preventDefault();
        }
    });

    // Click fuera cierra selectores
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.quantity-picker') && !e.target.closest('.add-to-cart-btn')) {
            document.querySelectorAll('.quantity-picker').forEach(q => {
                q.style.display = 'none';
            });
        }
    });
}

// Añadir al carrito
function addToCart(productId, quantity) {
    const products = loadProducts();
    const product = products.find(p => p.id == productId);
    
    if (!product) {
        console.error('Producto no encontrado:', productId);
        showToast('❌ Producto no encontrado');
        return;
    }
    
    let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const existingIndex = cart.findIndex(item => item.id == productId);
    
    if (existingIndex > -1) {
        cart[existingIndex].cantidad += quantity;
    } else {
        cart.push({
            id: product.id,
            nombre: product.nombre,
            descripcion: product.descripcion,
            precio: product.precio,
            imagen: product.imagen,
            cantidad: quantity
        });
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    updateTotalCartCount();
}

// Actualizar contadores
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const total = cart.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.textContent = total;
        cartCount.style.display = total > 0 ? 'inline-flex' : 'none';
    }
}

function updateTotalCartCount() {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const total = cart.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    
    const totalCount = document.getElementById('total-cart-count');
    if (totalCount) {
        totalCount.textContent = total;
    }
}

// Cargar y renderizar productos
function loadAndRenderProducts() {
    const products = loadProducts();
    console.log('Productos de bijouterie cargados:', products);
    renderProducts(products);
}

// Funciones helper
function formatPrice(value) {
    const number = parseFloat(value || 0);
    return number.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mostrar toast
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Escuchar cambios en el carrito
window.addEventListener('storage', function(e) {
    if (e.key === CART_KEY) {
        updateCartCount();
        updateTotalCartCount();
    }
});