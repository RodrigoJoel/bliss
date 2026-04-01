// ==================== CONFIGURACIÓN ====================
const CLOUDINARY_CLOUD_NAME = 'dlvj0hkyu';
const CLOUDINARY_UPLOAD_PRESET = 'yqppbyoz';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const SECTIONS = {
    1: { key: 'products_aromaticos', name: 'Productos Aromáticos' },
    2: { key: 'products_bijouterie', name: 'Productos Bijouterie' },
    3: { key: 'products_humidificadores', name: 'Productos Humidificadores' }
};

// ==================== FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyBm_eFEYlE-GOpSp8PzRvUzGPEl2pIsWz0",
    authDomain: "bliss-ffad9.firebaseapp.com",
    projectId: "bliss-ffad9",
    storageBucket: "bliss-ffad9.firebasestorage.app",
    messagingSenderId: "863864024902",
    appId: "1:863864024902:web:02cb9dd6997a0fa7353f47"
};

let db;
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('✅ Firebase inicializado en admin');
}

// ==================== SESIÓN ADMIN ====================
function checkAdminSession() {
    const token  = localStorage.getItem('admin_session_token');
    const expiry = localStorage.getItem('admin_session_expiry');
    if (!token || !expiry) { redirectToLogin(); return false; }
    if (Date.now() >= parseInt(expiry)) { clearAdminSession(); showSessionExpired(); return false; }
    updateAdminInfo();
    return true;
}

function redirectToLogin() {
    sessionStorage.setItem('admin_redirect_url', window.location.pathname);
    window.location.href = 'admin-login.html';
}

function clearAdminSession() {
    ['admin_session_token','admin_session_expiry','admin_user_name',
     'admin_last_login','admin_remember','admin_saved_user',
     'admin_login_attempts','admin_lock_until','admin_is_locked'
    ].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('admin_redirect_url');
}

function updateAdminInfo() {
    const userName = localStorage.getItem('admin_user_name');
    if (!userName) return;
    const el = document.getElementById('adminName');
    const av = document.getElementById('adminAvatar');
    if (el) el.textContent = userName;
    if (av) av.textContent = userName.charAt(0).toUpperCase();
}

function showSessionExpired() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:2000">
            <div style="background:white;padding:40px;border-radius:12px;text-align:center;max-width:400px">
                <i class="fas fa-clock" style="font-size:4rem;color:#fdcb6e;margin-bottom:20px;display:block"></i>
                <h3 style="margin-bottom:15px">Sesión Expirada</h3>
                <p style="color:#666;margin-bottom:25px">Tu sesión ha expirado. Por favor iniciá sesión nuevamente.</p>
                <button onclick="redirectToLogin()" style="background:#4a8ef5;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer">Ir al Login</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function handleLogout() {
    if (confirm('¿Estás seguro de cerrar sesión del panel de administrador?')) {
        clearAdminSession();
        showNotification('Sesión cerrada. Redirigiendo...', 'info');
        setTimeout(() => { window.location.href = 'admin-login.html'; }, 1500);
    }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadAllProducts();
    setupFormEvents();
    updateStats();
});

// ==================== NAVEGACIÓN ====================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views    = document.querySelectorAll('.content-view');

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const viewId = item.getAttribute('data-view');
            views.forEach(v => v.classList.remove('active'));

            const target = document.getElementById(viewId);
            if (target) {
                target.classList.add('active');
                updatePageTitle(item);
                const section = getSectionFromView(viewId);
                if (section) refreshSectionList(section);
                if (viewId === 'ordenes') loadOrders();
            }
        });
    });

    document.querySelectorAll('.card-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            document.querySelector(`.nav-item[data-view="${viewId}"]`)?.click();
        });
    });
}

function updatePageTitle(navItem) {
    const titles = {
        'dashboard':               ['Dashboard', 'Seleccioná en el menú lateral lo que deseás realizar'],
        'productos-aromas':        ['Productos Aromáticos', 'Gestioná tu catálogo de productos aromáticos'],
        'productos-bijouterie':    ['Productos Bijouterie', 'Gestioná tu colección de bijouterie y accesorios'],
        'productos-humidificadores':['Humidificadores', 'Gestioná tu catálogo de humidificadores'],
        'imagen-bienvenida':       ['Imagen de Bienvenida', 'Actualizá la imagen principal de la página de inicio'],
        'imagen-secciones':        ['Imágenes de Secciones', 'Gestioná las imágenes de las secciones del sitio'],
    };
    const viewId = navItem.getAttribute('data-view');
    const [title, subtitle] = titles[viewId] || [navItem.querySelector('span').textContent, 'Panel de administración'];
    const t = document.getElementById('pageTitle');
    const s = document.getElementById('pageSubtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;
}

function getSectionFromView(viewId) {
    return { 'productos-aromas': 1, 'productos-bijouterie': 2, 'productos-humidificadores': 3 }[viewId] || null;
}

// ==================== FIRESTORE: LEER ====================
async function loadSection(section) {
    if (!db) return [];
    try {
        const key  = SECTIONS[section].key;
        const snap = await db.collection('products').where('section', '==', key).orderBy('createdAt', 'desc').get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error('Error cargando productos:', e);
        return [];
    }
}

async function loadAllProducts() {
    for (const section of [1, 2, 3]) {
        await refreshSectionList(section);
    }
    updateStats();
}

async function refreshSectionList(section) {
    const container = document.getElementById(`list-${section}`);
    if (!container) return;
    container.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
    const items = await loadSection(section);
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8"><i class="fas fa-box-open" style="font-size:2rem;margin-bottom:10px;display:block"></i>No hay productos en esta sección</div>';
        return;
    }
    items.forEach(item => renderProductCard(item, section));
    updateStats();
}

// ==================== FIRESTORE: GUARDAR ====================
async function saveProductToFirestore(section, productData, productId = null) {
    if (!db) throw new Error('Firebase no inicializado');
    const key = SECTIONS[section].key;
    const data = {
        ...productData,
        section: key,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (productId) {
        await db.collection('products').doc(productId).update(data);
        return productId;
    } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('products').add(data);
        return ref.id;
    }
}

// ==================== FIRESTORE: ELIMINAR ====================
async function deleteProductFromFirestore(productId) {
    if (!db) throw new Error('Firebase no inicializado');
    await db.collection('products').doc(productId).delete();
}

// ==================== CLOUDINARY: SUBIR IMAGEN ====================
async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    showNotification('Subiendo imagen...', 'info');

    const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Error subiendo imagen a Cloudinary');

    const data = await response.json();
    return data.secure_url;
}

// ==================== RENDER CARD ====================
function renderProductCard(item, section) {
    const container = document.getElementById(`list-${section}`);
    if (!container) return;

    const existing = container.querySelector(`[data-id="${item.id}"]`);
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.className = `product-card ${item.active === false ? 'inactive' : ''}`;
    card.setAttribute('data-id', item.id);

    const statusText  = item.active === false ? 'Inactivo' : 'Activo';
    const statusClass = item.active === false ? 'status-inactive' : 'status-active';

    card.innerHTML = `
        <img src="${escapeAttr(item.photo || '')}" alt="${escapeAttr(item.name)}"
          onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\"><rect width=\"100%25\" height=\"100%25\" fill=\"%23f0f4ff\"/><text x=\"50%25\" y=\"50%25\" font-family=\"Montserrat\" font-size=\"10\" fill=\"%2394a3b8\" text-anchor=\"middle\" dy=\".3em\"></text></svg>
        <div class="product-info">
            <h4>${escapeHtml(item.name)}</h4>
            <div class="product-price">${formatPrice(item.price)}</div>
            <div class="product-description">${escapeHtml(item.features || item.descripcion || '')}</div>
            <div class="product-meta">
                <span>Stock: ${item.qty || 0}</span>
                <span class="product-status ${statusClass}">
                    <i class="fas fa-circle" style="font-size:8px"></i>
                    ${statusText}
                </span>
            </div>
            <div class="product-actions">
                <button class="action-btn edit-btn" onclick="editProduct(${section}, '${item.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn delete-btn" onclick="deleteProduct(${section}, '${item.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
                <button class="action-btn toggle-btn" onclick="toggleProduct(${section}, '${item.id}', ${item.active !== false})">
                    <i class="fas fa-power-off"></i> ${item.active === false ? 'Activar' : 'Desactivar'}
                </button>
            </div>
        </div>`;

    container.appendChild(card);
}

// ==================== FORMULARIO ====================
function openProductForm(section, productId = null) {
    const modal = document.getElementById('productModal');
    const form  = document.getElementById('productForm');

    form.reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('productActive').checked = true;
    document.getElementById('formSection').value = section;
    document.getElementById('currentPhotoUrl').value = ''; // ✅ Limpiar al inicio

    if (productId) {
        document.getElementById('modalTitle').textContent = 'Editar Producto';
        document.getElementById('formId').value = productId;

        // Cargar datos del producto desde Firestore
        db.collection('products').doc(productId).get().then(doc => {
            if (!doc.exists) return;
            const p = doc.data();
            document.getElementById('productName').value      = p.name || '';
            document.getElementById('productPrice').value     = p.price || '';
            document.getElementById('productDescription').value = p.features || p.descripcion || '';
            document.getElementById('productQuantity').value  = p.qty || 1;
            document.getElementById('productActive').checked  = p.active !== false;
            
            // ✅ Guardar la URL actual correctamente
            const currentPhotoUrl = p.photo || '';
            document.getElementById('currentPhotoUrl').value = currentPhotoUrl;

            if (currentPhotoUrl) {
                const preview = document.getElementById('photoPreview');
                preview.src = currentPhotoUrl;
                preview.style.display = 'block';
                document.querySelector('.upload-placeholder').style.display = 'none';
            }
        });
    } else {
        document.getElementById('modalTitle').textContent = `Agregar Producto — ${SECTIONS[section].name}`;
        document.getElementById('formId').value = '';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeProductForm() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function setupFormEvents() {
    const photoInput       = document.getElementById('productPhoto');
    const photoPreview     = document.getElementById('photoPreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');

    photoInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es demasiado grande. El máximo es 5MB.');
            photoInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    document.querySelector('.upload-preview').addEventListener('click', () => photoInput.click());

    document.getElementById('productForm').addEventListener('submit', e => {
        e.preventDefault();
        saveProduct();
    });

    document.getElementById('productModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeProductForm();
    });
}

async function saveProduct() {
    const section   = Number(document.getElementById('formSection').value);
    const productId = document.getElementById('formId').value || null;
    const name      = document.getElementById('productName').value.trim();
    const price     = Number(document.getElementById('productPrice').value);
    const features  = document.getElementById('productDescription').value.trim();
    const qty       = Number(document.getElementById('productQuantity').value);
    const active    = document.getElementById('productActive').checked;
    const file      = document.getElementById('productPhoto').files[0];
    
    // ✅ Obtener la URL de la imagen actual guardada en el campo hidden
    const currentPhotoUrl = document.getElementById('currentPhotoUrl').value;
    
    // ✅ Verificar si hay una imagen en el preview que sea válida
    const previewImg = document.getElementById('photoPreview');
    const hasPreviewImage = previewImg.style.display === 'block' && previewImg.src && 
                            !previewImg.src.includes('data:image/svg+xml') &&
                            previewImg.src !== '';

    if (!name || price <= 0) {
        alert('Por favor completá todos los campos requeridos.');
        return;
    }

    // ✅ VALIDACIÓN: Si es producto NUEVO (sin productId) y no hay imagen seleccionada
    if (!productId) {
        const tieneImagen = file || (currentPhotoUrl && currentPhotoUrl !== '');
        if (!tieneImagen) {
            alert('⚠️ Para agregar un producto nuevo, es obligatorio subir una imagen.\nPor favor seleccioná una imagen para continuar.');
            return;
        }
    }

    const saveBtn = document.querySelector('#productForm button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let photoUrl = '';
        
        // Caso 1: Hay un archivo nuevo seleccionado
        if (file) {
            showNotification('Subiendo nueva imagen...', 'info');
            photoUrl = await uploadImageToCloudinary(file);
        } 
        // Caso 2: No hay archivo nuevo, pero hay una imagen actual guardada (edición)
        else if (currentPhotoUrl && currentPhotoUrl !== '') {
            photoUrl = currentPhotoUrl;
        }
        // Caso 3: No hay archivo nuevo ni imagen actual, pero hay preview (solo para edición)
        else if (hasPreviewImage && !currentPhotoUrl && productId) {
            photoUrl = previewImg.src;
        }
        // Caso 4: Sin imagen (solo permitido en edición si ya tenía imagen)

        const productData = { 
            name, 
            price, 
            features, 
            qty, 
            active, 
            photo: photoUrl 
        };
        
        await saveProductToFirestore(section, productData, productId);
        await refreshSectionList(section);
        closeProductForm();
        showNotification('Producto guardado exitosamente ✓', 'success');

    } catch (error) {
        console.error('Error guardando producto:', error);
        showNotification('Error al guardar el producto. Intentá de nuevo.', 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
    }
}

// ==================== ACCIONES ====================
function editProduct(section, productId) {
    openProductForm(section, productId);
}

async function deleteProduct(section, productId) {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
    try {
        await deleteProductFromFirestore(productId);
        await refreshSectionList(section);
        showNotification('Producto eliminado', 'info');
    } catch (e) {
        console.error(e);
        showNotification('Error al eliminar el producto', 'danger');
    }
}

async function toggleProduct(section, productId, currentActive) {
    try {
        await db.collection('products').doc(productId).update({
            active: !currentActive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await refreshSectionList(section);
        showNotification(`Producto ${!currentActive ? 'activado' : 'desactivado'}`, 'success');
    } catch (e) {
        console.error(e);
        showNotification('Error al cambiar el estado', 'danger');
    }
}

async function clearSection(section) {
    const name = SECTIONS[section].name;
    if (!confirm(`¿Eliminar TODOS los productos de "${name}"? Esta acción no se puede deshacer.`)) return;

    try {
        const key  = SECTIONS[section].key;
        const snap = await db.collection('products').where('section', '==', key).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await refreshSectionList(section);
        showNotification('Sección limpiada', 'warning');
    } catch (e) {
        console.error(e);
        showNotification('Error al limpiar la sección', 'danger');
    }
}

// ==================== STATS ====================
async function updateStats() {
    if (!db) return;
    try {
        const snap = await db.collection('products').get();
        const el = document.getElementById('totalProducts');
        if (el) el.textContent = snap.size;
    } catch (e) {
        console.error(e);
    }
}

// ==================== IMÁGENES ====================
function setupImageEvents() {
    const welcomeUpload  = document.getElementById('welcome-image-upload');
    const welcomePreview = document.getElementById('welcome-image-preview');
    if (!welcomeUpload) return;

    welcomeUpload.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es demasiado grande. El máximo es 2MB.');
            welcomeUpload.value = '';
            return;
        }
        try {
            const url = await uploadImageToCloudinary(file);
            welcomePreview.src = url;
            await db.collection('settings').doc('welcome_image').set({ url });
            showNotification('Imagen de bienvenida actualizada ✓', 'success');
        } catch (e) {
            showNotification('Error subiendo la imagen', 'danger');
        }
    });

    // Cargar imagen guardada
    db.collection('settings').doc('welcome_image').get().then(doc => {
        if (doc.exists) welcomePreview.src = doc.data().url;
    });
}

function resetWelcomeImage() {
    if (!confirm('¿Restaurar la imagen de bienvenida por defecto?')) return;
    db.collection('settings').doc('welcome_image').delete().then(() => {
        document.getElementById('welcome-image-preview').src = '';
        showNotification('Imagen restaurada', 'info');
    });
}

// ==================== HELPERS ====================
function formatPrice(price) {
    if (!price && price !== 0) return '$0,00';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '$0,00';
    const [int, dec] = num.toFixed(2).split('.');
    return '$' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function escapeAttr(text) {
    return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showNotification(message, type = 'info') {
    const colors = { success: '#00b894', warning: '#fdcb6e', danger: '#e17055', info: '#4a8ef5' };
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 22px;background:${colors[type]||colors.info};color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-family:Montserrat,sans-serif;font-size:14px;font-weight:500;animation:slideIn 0.3s ease;max-width:300px`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 3000);

    if (!document.getElementById('notif-styles')) {
        const s = document.createElement('style');
        s.id = 'notif-styles';
        s.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
        document.head.appendChild(s);
    }
}

// ==================== MIGRACIÓN DESDE LOCALSTORAGE ====================
// Ejecutar UNA SOLA VEZ para migrar productos existentes
async function migrateFromLocalStorage() {
    if (!db) return;
    if (!confirm('¿Migrar productos del localStorage a Firebase? Hacé esto solo una vez.')) return;

    let count = 0;
    const batch = db.batch();

    for (const section of [1, 2, 3]) {
        const key  = `admin_products_section_${section}`;
        const raw  = localStorage.getItem(key);
        if (!raw) continue;

        const items = JSON.parse(raw);
        const firestoreKey = SECTIONS[section].key;

        for (const item of items) {
            const ref = db.collection('products').doc();
            batch.set(ref, {
                name:      item.name || '',
                price:     Number(item.price) || 0,
                features:  item.features || item.descripcion || '',
                qty:       Number(item.qty) || 1,
                photo:     item.photo || '',
                active:    item.active !== false,
                section:   firestoreKey,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            count++;
        }
    }

    await batch.commit();
    showNotification(`✓ ${count} productos migrados a Firebase`, 'success');
    await loadAllProducts();
}

// ==================== GESTIÓN DE ÓRDENES ====================

// Estados posibles
const ORDER_STATUS = {
    pending: { label: 'Pendiente', color: '#fdcb6e', icon: 'fa-clock', class: 'status-pending' },
    approved: { label: 'Confirmado', color: '#00b894', icon: 'fa-check-circle', class: 'status-approved' },
    shipped: { label: 'Enviado', color: '#4a8ef5', icon: 'fa-shipping-fast', class: 'status-shipped' },
    delivered: { label: 'Entregado', color: '#6c5ce7', icon: 'fa-box-open', class: 'status-delivered' },
    cancelled: { label: 'Cancelado', color: '#e17055', icon: 'fa-times-circle', class: 'status-cancelled' }
};

let allOrders = [];
let filteredOrders = [];

// Cargar órdenes desde Firebase
async function loadOrders() {
    if (!db) {
        console.error('Firebase no inicializado');
        return;
    }

    showOrdersLoading();

    try {
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();
        
        allOrders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allOrders.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
            });
        });

        filteredOrders = [...allOrders];
        updateOrdersStats();
        renderOrdersList();
        
    } catch (error) {
        console.error('Error cargando órdenes:', error);
        showOrdersError('Error al cargar las órdenes. Intentá nuevamente.');
    }
}

// Mostrar loading
function showOrdersLoading() {
    const container = document.getElementById('orders-container');
    if (container) {
        container.innerHTML = `
            <div class="orders-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando órdenes...</p>
            </div>
        `;
    }
}

function showOrdersError(message) {
    const container = document.getElementById('orders-container');
    if (container) {
        container.innerHTML = `
            <div class="orders-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="loadOrders()" class="btn-primary">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Actualizar estadísticas
function updateOrdersStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const approved = allOrders.filter(o => o.status === 'approved').length;
    const shipped = allOrders.filter(o => o.status === 'shipped').length;

    const totalEl = document.getElementById('orders-total');
    const pendingEl = document.getElementById('orders-pending');
    const approvedEl = document.getElementById('orders-approved');
    const shippedEl = document.getElementById('orders-shipped');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (shippedEl) shippedEl.textContent = shipped;
}

// Filtrar órdenes
function filterOrders() {
    const searchTerm = document.getElementById('orders-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('orders-status-filter')?.value || '';
    const dateFilter = document.getElementById('orders-date-filter')?.value || '';

    filteredOrders = allOrders.filter(order => {
        // Búsqueda por nombre, email o ID
        if (searchTerm) {
            const matchesSearch = 
                (order.name || '').toLowerCase().includes(searchTerm) ||
                (order.email || '').toLowerCase().includes(searchTerm) ||
                order.id.toLowerCase().includes(searchTerm) ||
                (order.orderNumber || '').toLowerCase().includes(searchTerm);
            
            if (!matchesSearch) return false;
        }

        // Filtro por estado
        if (statusFilter && order.status !== statusFilter) return false;

        // Filtro por fecha
        if (dateFilter && order.createdAt) {
            const orderDate = order.createdAt.toISOString().split('T')[0];
            if (orderDate !== dateFilter) return false;
        }

        return true;
    });

    renderOrdersList();
}

// Renderizar lista de órdenes
function renderOrdersList() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="orders-empty">
                <i class="fas fa-inbox"></i>
                <p>No se encontraron órdenes</p>
                <small>Probá con otros filtros de búsqueda</small>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredOrders.map(order => `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-header">
                <div class="order-info">
                    <div class="order-number">
                        <i class="fas fa-receipt"></i>
                        <span>${order.orderNumber || order.id.slice(0, 8)}</span>
                    </div>
                    <div class="order-date">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formatDate(order.createdAt)}</span>
                    </div>
                </div>
                <div class="order-status ${ORDER_STATUS[order.status]?.class || 'status-pending'}">
                    <i class="fas ${ORDER_STATUS[order.status]?.icon || 'fa-clock'}"></i>
                    <span>${ORDER_STATUS[order.status]?.label || 'Pendiente'}</span>
                </div>
            </div>

            <div class="order-customer">
                <div class="customer-info">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>${escapeHtml(order.name || 'Cliente')}</strong>
                        <small>${escapeHtml(order.email || 'Sin email')}</small>
                    </div>
                </div>
                <div class="customer-phone">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(order.phone || 'Sin teléfono')}</span>
                </div>
            </div>

            <div class="order-summary">
                <div class="order-items">
                    <i class="fas fa-box"></i>
                    <span>${order.items?.length || 0} productos</span>
                </div>
                <div class="order-total">
                    <strong>Total:</strong>
                    <span class="total-amount">${formatPrice(order.total || 0)}</span>
                </div>
            </div>

            <div class="order-actions">
                <button class="btn-outline-sm" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i> Ver detalles
                </button>
                <select class="order-status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="approved" ${order.status === 'approved' ? 'selected' : ''}>Confirmado</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Enviado</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Entregado</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Formatear fecha
function formatDate(date) {
    if (!date) return 'Fecha no disponible';
    return new Date(date).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Ver detalles de la orden
async function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    // Crear modal de detalles
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content order-details-modal">
            <div class="modal-header">
                <h3><i class="fas fa-receipt"></i> Detalles de la Orden</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            
            <div class="order-details-content">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Información General</h4>
                    <div class="details-grid">
                        <div><strong>Número de orden:</strong> ${order.orderNumber || order.id.slice(0, 8)}</div>
                        <div><strong>Fecha:</strong> ${formatDate(order.createdAt)}</div>
                        <div><strong>Estado:</strong> <span class="order-status ${ORDER_STATUS[order.status]?.class}">${ORDER_STATUS[order.status]?.label}</span></div>
                        <div><strong>Método de entrega:</strong> ${order.deliveryMethod || 'No especificado'}</div>
                        <div><strong>Método de pago:</strong> ${order.paymentMethod ? getPaymentMethodName(order.paymentMethod) : 'No especificado'}</div>
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                    <div class="details-grid">
                        <div><strong>Nombre:</strong> ${escapeHtml(order.name || '-')}</div>
                        <div><strong>Email:</strong> ${escapeHtml(order.email || '-')}</div>
                        <div><strong>Teléfono:</strong> ${escapeHtml(order.phone || '-')}</div>
                        ${order.shippingAddress ? `<div><strong>Dirección de envío:</strong> ${escapeHtml(order.shippingAddress)}</div>` : ''}
                        ${order.notes ? `<div><strong>Notas:</strong> ${escapeHtml(order.notes)}</div>` : ''}
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-shopping-cart"></i> Productos</h4>
                    <div class="order-items-list">
                        ${order.items?.map(item => `
                            <div class="order-detail-item">
                                <div class="item-image">
                                    <img src="${item.image || 'imagenes/default-product.jpg'}" alt="${item.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23f0f4ff%22/%3E%3C/svg%3E'">
                                </div>
                                <div class="item-info">
                                    <div class="item-name">${escapeHtml(item.name)}</div>
                                    <div class="item-price">${formatPrice(item.price)} c/u</div>
                                </div>
                                <div class="item-quantity">x${item.quantity}</div>
                                <div class="item-subtotal">${formatPrice(item.price * item.quantity)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="details-section totals">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>${formatPrice(order.subtotal || 0)}</span>
                    </div>
                    <div class="totals-row">
                        <span>Envío:</span>
                        <span>${order.shippingCost === 0 ? 'Gratis' : formatPrice(order.shippingCost)}</span>
                    </div>
                    <div class="totals-row grand-total">
                        <span><strong>TOTAL:</strong></span>
                        <span><strong>${formatPrice(order.total || 0)}</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                <button class="btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Obtener nombre del método de pago
function getPaymentMethodName(method) {
    const methods = {
        mercadopago: 'Mercado Pago',
        transfer: 'Transferencia bancaria',
        cash: 'Efectivo en local'
    };
    return methods[method] || method;
}

// Actualizar estado de la orden
async function updateOrderStatus(orderId, newStatus) {
    if (!db) return;

    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Actualizar localmente
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.status = newStatus;

        updateOrdersStats();
        renderOrdersList();
        
        showNotification(`Estado de la orden actualizado a "${ORDER_STATUS[newStatus]?.label}"`, 'success');

    } catch (error) {
        console.error('Error actualizando estado:', error);
        showNotification('Error al actualizar el estado', 'danger');
    }
}

// Exportar órdenes a CSV
function exportOrdersToCSV() {
    const ordersToExport = filteredOrders.length > 0 ? filteredOrders : allOrders;
    
    const headers = [
        'ID Orden',
        'Número',
        'Fecha',
        'Cliente',
        'Email',
        'Teléfono',
        'Total',
        'Estado',
        'Método de entrega',
        'Método de pago'
    ];

    const rows = ordersToExport.map(order => [
        order.id,
        order.orderNumber || '',
        formatDate(order.createdAt),
        order.name || '',
        order.email || '',
        order.phone || '',
        (order.total || 0).toFixed(2),
        ORDER_STATUS[order.status]?.label || 'Pendiente',
        order.deliveryMethod || '',
        getPaymentMethodName(order.paymentMethod)
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ordenes_bliss_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Órdenes exportadas correctamente', 'success');
}