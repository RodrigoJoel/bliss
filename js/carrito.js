// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN FIREBASE
// ==========================================
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
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('✅ Firebase inicializado');
    } catch (error) { console.error('Error Firebase:', error); }
}

const stockCache = new Map();

async function getProductStock(productId) {
    if (stockCache.has(productId)) return stockCache.get(productId);
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
            const stock = doc.data().qty || 0;
            stockCache.set(productId, stock);
            return stock;
        }
        return 0;
    } catch (e) { return 0; }
}

// ==========================================
// 2. LÓGICA DE INTERFAZ Y EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (auth) {
        auth.onAuthStateChanged((user) => {
            user ? showUserState(user) : showLoginState();
        });
    }

    initCatalogDropdown();
    
    if (typeof cart !== 'undefined') {
        cart.loadCart();
    }

    // ✅ VACIAR CARRITO CON RECARGA EN 1ms
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('¿Vaciar todo el carrito?')) {
                cart.items = [];
                localStorage.setItem(cart.CART_KEY, JSON.stringify([]));
                setTimeout(() => { window.location.reload(); }, 1);
            }
        });
    }
});

// ✅ CAMBIO DE CANTIDAD
async function changeQuantity(productId, sectionId, newQuantity) {
    const item = cart.items.find(i => i.id === productId && i.section === sectionId);
    if (!item) return;
    
    if (newQuantity < item.quantity) {
        cart.updateQuantity(productId, sectionId, newQuantity);
        await renderCartPage(); 
        return;
    }
    
    const stock = await getProductStock(productId);
    if (newQuantity > stock) return; // Bloqueo de seguridad extra
    
    cart.updateQuantity(productId, sectionId, newQuantity);
    await renderCartPage();
}

// ✅ RENDERIZADO CON BLOQUEO DE BOTÓN +
async function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-message');
    const summary = document.getElementById('cart-summary');
    
    if (!container || !cart) return;
    
    if (!cart.items || cart.items.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (summary) summary.style.display = 'none';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (summary) summary.style.display = 'block';

    // Generamos el HTML asíncronamente para verificar stock de cada item
    const itemsHTML = await Promise.all(cart.items.map(async (item) => {
        const stockDisponible = await getProductStock(item.id);
        const isMax = item.quantity >= stockDisponible;

        return `
            <div class="cart-item">
                <img src="${item.image || 'imagenes/default-product.jpg'}" class="item-image">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>${cart.formatPrice(item.price)}</p>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity - 1})">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" 
                        ${isMax ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} 
                        onclick="changeQuantity('${item.id}', ${item.section}, ${item.quantity + 1})">
                        ${isMax ? 'MAX' : '+'}
                    </button>
                </div>
            </div>
        `;
    }));

    container.innerHTML = itemsHTML.join('');
}

// ✅ HELPERS
function showUserState(user) {
    const l = document.getElementById('loginState'), u = document.getElementById('userState');
    if (l) l.style.display = 'none';
    if (u) u.style.display = 'block';
}

function showLoginState() {
    const l = document.getElementById('loginState'), u = document.getElementById('userState');
    if (l) l.style.display = 'block';
    if (u) u.style.display = 'none';
}

function initCatalogDropdown() {
    const btn = document.getElementById('catalog-btn'), menu = document.getElementById('catalog-dropdown');
    if (btn && menu) btn.onclick = () => menu.classList.toggle('open');
}
function loadDynamicContent() {
    const logoImg = document.getElementById('header-logo');
    
    if (typeof firebase === 'undefined') return;
    const db = firebase.firestore();
    
    db.collection('settings').doc('appearance').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                // Si hay una URL de logo guardada, la aplica a todas las páginas que tengan el ID
                if (data.logoUrl && logoImg) {
                    logoImg.src = data.logoUrl;
                }
            }
        })
        .catch(err => console.error("Error cargando logo dinámico:", err));
}

// Esto hace que se ejecute en cada página al entrar
document.addEventListener('DOMContentLoaded', loadDynamicContent);