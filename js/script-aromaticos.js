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
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db   = firebase.firestore();
}

const SECTION_KEY = 'products_aromaticos';
let cachedProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    if (auth) auth.onAuthStateChanged(user => user ? showUserState(user) : showLoginState());
    initCatalogDropdown();
    loadAndRenderProducts();
    if (typeof cart !== 'undefined') { cart.updateCartUI(); updateCartCount(); }
});

// ==================== AUTH ====================
async function showUserState(user) {
    document.getElementById('loginState')?.style.setProperty('display', 'none');
    document.getElementById('userState')?.style.setProperty('display', 'block');
    let initial = user.email?.charAt(0).toUpperCase() || 'U';
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().firstName) initial = doc.data().firstName.charAt(0).toUpperCase();
    } catch {}
    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initial;
}

function showLoginState() {
    document.getElementById('loginState')?.style.setProperty('display', 'block');
    document.getElementById('userState')?.style.setProperty('display', 'none');
}

function handleLogout() { auth?.signOut().then(showLoginState); }

// ==================== DROPDOWN ====================
function initCatalogDropdown() {
    const dropdown = document.getElementById('catalog-dropdown');
    const button   = document.getElementById('catalog-btn');
    const menu     = document.getElementById('catalog-menu');
    if (!dropdown || !button || !menu) return;
    let closeTimer = null;
    const open  = () => { clearTimeout(closeTimer); closeTimer = null; dropdown.classList.add('open'); button.setAttribute('aria-expanded','true'); };
    const close = () => { dropdown.classList.remove('open'); button.setAttribute('aria-expanded','false'); };
    dropdown.addEventListener('mouseenter', open);
    dropdown.addEventListener('mouseleave', () => { closeTimer = setTimeout(close, 200); });
    button.addEventListener('click', e => { e.stopPropagation(); button.getAttribute('aria-expanded')==='true' ? close() : open(); });
    document.addEventListener('click', e => { if (!dropdown.contains(e.target)) close(); });
    menu.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
}

// ==================== PRODUCTOS ====================
async function loadAndRenderProducts() {
    const grid  = document.getElementById('productsGrid');
    const empty = document.getElementById('empty');
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a3b8"><i class="fas fa-spinner fa-spin" style="font-size:2rem;margin-bottom:12px;display:block"></i>Cargando productos...</div>`;

    try {
        const snap = await db.collection('products')
            .where('section', '==', SECTION_KEY)
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        cachedProducts = snap.docs.map(doc => ({
            id:          doc.id,
            nombre:      doc.data().name || '',
            descripcion: doc.data().features || doc.data().descripcion || '',
            precio:      Number(doc.data().price || 0),
            imagen:      doc.data().photo || '',
            stock:       Number(doc.data().qty ?? 99)
        }));

        renderProducts(cachedProducts);
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444"><i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:10px;display:block"></i>Error al cargar los productos.</div>`;
    }
}

function renderProducts(products) {
    
    const grid  = document.getElementById('productsGrid');
    const empty = document.getElementById('empty');
    if (!grid) return;
    grid.innerHTML = '';
    if (!products.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';

    products.forEach(p => {
        const sinStock = p.stock <= 0;
        const stockBadge = sinStock
            ? `<span style="font-size:11px;color:#ef4444;font-weight:600;display:block;margin-top:3px">Sin stock</span>`
            : p.stock <= 3
                ? `<span style="font-size:11px;color:#f59e0b;font-weight:600;display:block;margin-top:3px">Últimas ${p.stock} unidades</span>`
                : '';

        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.imagen}" class="product-image"
                 onclick="openLightbox('${p.imagen}', '${escapeHtml(p.nombre)}')"
                 onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"160\"><rect width=\"100%25\" height=\"100%25\" fill=\"%23f0f4ff\"/><text x=\"50%25\" y=\"50%25\" font-family=\"Montserrat\" font-size=\"12\" fill=\"%2394a3b8\" text-anchor=\"middle\" dy=\".3em\"></text></svg>
            <div class="product-body">
                <h3>${escapeHtml(p.nombre)}</h3>
                <p>${escapeHtml(p.descripcion)}</p>
                <div class="product-footer">
                    <div>
                        <strong>${formatPrice(p.precio)}</strong>
                        ${stockBadge}
                    </div>
                    <button class="add-to-cart-btn" data-id="${p.id}"
                        ${sinStock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                        <i class="fas fa-cart-plus"></i> ${sinStock ? 'Sin stock' : 'Agregar'}
                    </button>
                </div>
            </div>`;
        grid.appendChild(card);
        
    });
    
}

// ==================== CARRITO ====================
document.addEventListener('click', e => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn || btn.disabled) return;

    const product = cachedProducts.find(p => p.id === btn.dataset.id);
    if (!product) return;

    const enCarrito = cart?.items?.find(i => i.id === product.id)?.quantity || 0;
    if (enCarrito >= product.stock) {
        showToast(`⚠️ Solo hay ${product.stock} unidad${product.stock !== 1 ? 'es' : ''} disponible${product.stock !== 1 ? 's' : ''}`);
        return;
    }

    cart.addProduct({ id: product.id, name: product.nombre, price: product.precio, section: 1, image: product.imagen, stock: product.stock }, 1);
    updateCartCount();
    showToast('✓ Producto agregado');
});

function updateCartCount() {
    const count = cart?.getTotalItems() || 0;
    const el  = document.getElementById('cart-count');
    const el2 = document.getElementById('total-cart-count');
    if (el)  { el.textContent = count; el.style.display = count ? 'inline-flex' : 'none'; }
    if (el2) el2.textContent = count;
}

function formatPrice(v) { return Number(v||0).toLocaleString('es-AR',{style:'currency',currency:'ARS'}); }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text||''; return d.innerHTML; }
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== LIGHTBOX =====
function openLightbox(src, alt) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
        <button class="lightbox-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
        <img class="lightbox-img" src="${src}" alt="${alt || ''}">`;

    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });

    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
}