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

// ✅ CACHE DE STOCK PARA EVITAR MÚLTIPLES CONSULTAS
const stockCache = new Map();

// ✅ FUNCIÓN PARA OBTENER STOCK DESDE FIRESTORE
async function getProductStock(productId) {
    // Verificar caché primero
    if (stockCache.has(productId)) {
        return stockCache.get(productId);
    }
    
    try {
        const productDoc = await db.collection('products').doc(productId).get();
        if (productDoc.exists) {
            const stock = productDoc.data().qty || 0;
            stockCache.set(productId, stock);
            return stock;
        }
        return 0;
    } catch (error) {
        console.error('Error obteniendo stock:', error);
        return 0;
    }
}

// ✅ FUNCIÓN PARA ACTUALIZAR STOCK EN FIRESTORE
async function updateProductStock(productId, newStock) {
    try {
        await db.collection('products').doc(productId).update({
            qty: newStock,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Actualizar caché
        stockCache.set(productId, newStock);
        return true;
    } catch (error) {
        console.error('Error actualizando stock:', error);
        return false;
    }
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
    
    // ✅ INICIALIZACIÓN DEL CARRITO
    if (typeof cart !== 'undefined') {
        cart.loadCart();
        renderCartPage();
    } else {
        console.error('Error carrito no cargado');
    }
    
    document.getElementById('current-year').textContent = new Date().getFullYear();
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

// ✅ FUNCIÓN PARA CAMBIAR CANTIDAD CON VERIFICACIÓN DE STOCK
async function changeQuantity(productId, sectionId, newQuantity) {
    // Obtener el item actual del carrito
    const currentItem = cart.items.find(i => i.id === productId && i.section === sectionId);
    if (!currentItem) return;
    
    // Si la nueva cantidad es menor que la actual, permitir sin verificar stock
    if (newQuantity < currentItem.quantity) {
        cart.updateQuantity(productId, sectionId, newQuantity);
        renderCartPage();
        if (typeof updateCartCount === 'function') updateCartCount();
        return;
    }
    
    // Si está aumentando la cantidad, verificar stock disponible
    if (newQuantity > currentItem.quantity) {
        const stockDisponible = await getProductStock(productId);
        const cantidadActual = currentItem.quantity;
        const incremento = newQuantity - cantidadActual;
        
        if (cantidadActual + incremento > stockDisponible) {
            const maxPermitido = stockDisponible;
            const mensaje = stockDisponible === 0 
                ? '⚠️ Este producto no tiene stock disponible.'
                : `⚠️ Stock insuficiente. Solo quedan ${stockDisponible} unidades.`;
            
            showNotification(mensaje, 'warning');
            
            // Si hay stock pero no alcanza para la cantidad deseada, ajustar al máximo disponible
            if (stockDisponible > 0 && stockDisponible !== cantidadActual) {
                cart.updateQuantity(productId, sectionId, stockDisponible);
                renderCartPage();
                showNotification(`Cantidad ajustada a ${stockDisponible} unidades (stock disponible)`, 'info');
            }
            return;
        }
        
        cart.updateQuantity(productId, sectionId, newQuantity);
        renderCartPage();
        if (typeof updateCartCount === 'function') updateCartCount();
    }
}

// ✅ RENDERIZAR CARRITO (con stock mostrado)
function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-message');
    const clearBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('go-to-checkout-btn');
    
    if (!container) return;
    
    console.log('Renderizando carrito. Items:', cart.items ? cart.items.length : 0);
    
    if (!cart.items || cart.items.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        container.innerHTML = '';
        updateSummary(0);
        return;
    }
    
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    // Renderizar con indicador de stock
    container.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'imagenes/default-product.jpg'}" class="item-image"
                 onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><rect width=\"100%25\" height=\"100%25\" fill=\"%23f8f9fa\"/><text x=\"50%25\" y=\"50%25\" font-family=\"Arial\" font-size=\"14\" fill=\"%23999\" text-anchor=\"middle\" dy=\".3em\">Sin imagen</text></svg>'">
            <div class="item-details">
                <h4>${escapeHtml(item.name)}</h4>
                <p>${formatPrice(item.price)} c/u</p>
                <small style="color:#666; font-size:11px;">
                    <i class="fas fa-box"></i> Stock disponible: <span id="stock-${item.id}">...</span>
                </small>
            </div>
            <div class="quantity-controls">
                <button onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity + 1})">+</button>
            </div>
            <div class="item-total">
                ${formatPrice(item.price * item.quantity)}
                <button class="remove-item" onclick="removeFromCart('${item.id}', ${item.section})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Cargar stocks para cada producto
    cart.items.forEach(async (item) => {
        const stock = await getProductStock(item.id);
        const stockSpan = document.getElementById(`stock-${item.id}`);
        if (stockSpan) {
            stockSpan.textContent = stock;
            if (item.quantity >= stock && stock > 0) {
                stockSpan.style.color = '#e74c3c';
                stockSpan.style.fontWeight = 'bold';
            } else if (stock <= 3 && stock > 0) {
                stockSpan.style.color = '#f39c12';
            }
        }
    });

    const subtotal = cart.getSubtotal();
    updateSummary(subtotal);
}

function removeFromCart(productId, sectionId) {
    if (confirm('¿Eliminar este producto del carrito?')) {
        cart.removeProduct(productId, sectionId);
        renderCartPage();
        if (typeof updateCartCount === 'function') updateCartCount();
    }
}

// ✅ FUNCIÓN PARA VACIAR EL CARRITO
function clearCartAndRender() {
    if (confirm('¿Estás seguro de que quieres vaciar todo el carrito?')) {
        console.log('Vaciando carrito...');
        cart.items = [];
        cart.saveCart();
        renderCartPage();
        
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = '0';
            cartCount.style.display = 'none';
        }
        
        if (typeof updateCartCount === 'function') updateCartCount();
        console.log('Carrito vaciado correctamente');
    }
}

// ENVÍO DESACTIVADO (A coordinar)
function calculateShipping() {
    return 0;
}

// ACTUALIZAR RESUMEN
function updateSummary(subtotal) {
    const subtotalEl = document.getElementById('summary-subtotal');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = "A coordinar";
    if (totalEl) totalEl.textContent = formatPrice(subtotal);
}

// ✅ FUNCIÓN PARA MOSTRAR NOTIFICACIONES
function showNotification(message, type = 'info') {
    const colors = {
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#e17055',
        info: '#4a8ef5'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        max-width: 350px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ✅ CONFIGURACIÓN DEL BOTÓN VACIAR CARRITO
document.addEventListener('DOMContentLoaded', function() {
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (clearCartBtn) {
        const newBtn = clearCartBtn.cloneNode(true);
        clearCartBtn.parentNode.replaceChild(newBtn, clearCartBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearCartAndRender();
        });
        
        console.log('Botón vaciar carrito configurado');
    }
});

// Helper para escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ==================== CARGA DE PRODUCTOS ====================


