// ========== SISTEMA DE AUTENTICACIÓN ==========

// Verificar sesión de administrador
function checkAdminSession() {
    const sessionToken = localStorage.getItem('admin_session_token');
    const sessionExpiry = localStorage.getItem('admin_session_expiry');
    
    // Si no hay sesión, redirigir al login
    if (!sessionToken || !sessionExpiry) {
        redirectToLogin();
        return false;
    }
    
    // Verificar si la sesión expiró
    const now = Date.now();
    const expiry = parseInt(sessionExpiry);
    
    if (now >= expiry) {
        // Sesión expirada
        clearAdminSession();
        showSessionExpired();
        return false;
    }
    
    // Sesión válida
    updateAdminInfo();
    return true;
}

// Redirigir al login
function redirectToLogin() {
    // Guardar la página actual para redirigir después del login
    sessionStorage.setItem('admin_redirect_url', window.location.pathname);
    window.location.href = 'admin-login.html';
}

// Limpiar sesión
function clearAdminSession() {
    localStorage.removeItem('admin_session_token');
    localStorage.removeItem('admin_session_expiry');
    localStorage.removeItem('admin_user_name');
    localStorage.removeItem('admin_last_login');
}

// Mostrar que la sesión expiró
function showSessionExpired() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="session-expired-modal">
            <div class="modal-content">
                <i class="fas fa-clock"></i>
                <h3>Sesión Expirada</h3>
                <p>Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.</p>
                <button onclick="redirectToLogin()">Ir al Login</button>
            </div>
        </div>
    `;
    
    // Estilos
    const style = document.createElement('style');
    style.textContent = `
        .session-expired-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        .session-expired-modal .modal-content {
            background: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            animation: slideUp 0.3s ease;
        }
        .session-expired-modal i {
            font-size: 4rem;
            color: #fdcb6e;
            margin-bottom: 20px;
        }
        .session-expired-modal h3 {
            margin-bottom: 15px;
            color: #231f20;
        }
        .session-expired-modal p {
            color: #666;
            margin-bottom: 25px;
            line-height: 1.5;
        }
        .session-expired-modal button {
            background: #4a8ef5;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .session-expired-modal button:hover {
            background: #2d6bc8;
            transform: translateY(-2px);
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

// Actualizar información del administrador
function updateAdminInfo() {
    const userName = localStorage.getItem('admin_user_name');
    const lastLogin = localStorage.getItem('admin_last_login');
    
    if (userName) {
        const adminNameElement = document.getElementById('adminName');
        const adminAvatarElement = document.getElementById('adminAvatar');
        
        if (adminNameElement) {
            adminNameElement.textContent = userName;
        }
        
        if (adminAvatarElement) {
            adminAvatarElement.textContent = userName.charAt(0).toUpperCase();
        }
    }
    
    if (lastLogin) {
        // Opcional: Mostrar última conexión
        console.log('Último login:', new Date(lastLogin).toLocaleString());
    }
}

// Manejar logout desde el panel
function handleLogout() {
    if (confirm('¿Estás seguro de cerrar sesión del panel de administrador?')) {
        clearAdminSession();
        showNotification('Sesión cerrada exitosamente', 'info');
        
        // Redirigir al login después de 1 segundo
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }
}

// Auto-logout por inactividad (opcional)
function setupInactivityTimer() {
    let inactivityTimer;
    
    function resetTimer() {
        clearTimeout(inactivityTimer);
        // Cerrar sesión después de 30 minutos de inactividad
        inactivityTimer = setTimeout(() => {
            if (confirm('Tu sesión está a punto de expirar por inactividad. ¿Deseas permanecer conectado?')) {
                resetTimer();
                // Renovar sesión
                const newExpiry = Date.now() + (30 * 60 * 1000); // 30 minutos más
                localStorage.setItem('admin_session_expiry', newExpiry.toString());
            } else {
                clearAdminSession();
                redirectToLogin();
            }
        }, 30 * 60 * 1000); // 30 minutos
    }
    
    // Eventos que resetean el timer
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, resetTimer);
    });
    
    resetTimer(); // Iniciar el timer
}
// Variables globales
let auth, db;
const SECTIONS = {
    1: { key: 'admin_products_section_1', name: 'Productos Aromáticos' },
    2: { key: 'admin_products_section_2', name: 'Productos Bijouterie' },
    3: { key: 'admin_products_section_3', name: 'Productos Humidificadores' }
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar navegación
    initNavigation();
    
    // Cargar productos
    loadAllProducts();
    
    // Configurar eventos del formulario
    setupFormEvents();
    
    // Configurar eventos de subida de imágenes
    setupImageEvents();
    
    // Actualizar estadísticas
    updateStats();
});

// Inicializar navegación del sidebar
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-view');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los items
            navItems.forEach(i => i.classList.remove('active'));
            
            // Agregar clase active al item clickeado
            item.classList.add('active');
            
            // Obtener la vista a mostrar
            const viewId = item.getAttribute('data-view');
            
            // Ocultar todas las vistas
            views.forEach(view => {
                view.classList.remove('active');
            });
            
            // Mostrar la vista seleccionada
            const targetView = document.getElementById(viewId);
            if (targetView) {
                targetView.classList.add('active');
                
                // Actualizar título y subtítulo
                updatePageTitle(item);
                
                // Si es una vista de productos, cargar esa sección
                if (viewId.includes('productos')) {
                    const section = getSectionFromView(viewId);
                    if (section) refreshSectionList(section);
                }
            }
        });
    });
    
    // Configurar botones de acción en el dashboard
    document.querySelectorAll('.card-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            const targetItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
            if (targetItem) targetItem.click();
        });
    });
}

// Actualizar título de la página
function updatePageTitle(navItem) {
    const titleElement = document.getElementById('pageTitle');
    const subtitleElement = document.getElementById('pageSubtitle');
    
    if (!titleElement || !subtitleElement) return;
    
    const itemText = navItem.querySelector('span').textContent;
    
    switch(navItem.getAttribute('data-view')) {
        case 'dashboard':
            titleElement.textContent = 'Dashboard';
            subtitleElement.textContent = 'Selecciona en el menú lateral lo que deseas realizar';
            break;
        case 'productos-aromas':
            titleElement.textContent = 'Productos Aromáticos';
            subtitleElement.textContent = 'Gestiona tu catálogo de productos aromáticos';
            break;
        case 'productos-bijouterie':
            titleElement.textContent = 'Productos Bijouterie';
            subtitleElement.textContent = 'Gestiona tu colección de bijouterie y accesorios';
            break;
        case 'productos-humidificadores':
            titleElement.textContent = 'Humidificadores';
            subtitleElement.textContent = 'Gestiona tu catálogo de humidificadores';
            break;
        case 'imagen-bienvenida':
            titleElement.textContent = 'Imagen de Bienvenida';
            subtitleElement.textContent = 'Actualiza la imagen principal de la página de inicio';
            break;
        case 'imagen-secciones':
            titleElement.textContent = 'Imágenes de Secciones';
            subtitleElement.textContent = 'Gestiona las imágenes de las diferentes secciones del sitio';
            break;
        default:
            titleElement.textContent = itemText;
            subtitleElement.textContent = 'Panel de administración';
    }
}

// Obtener sección a partir de la vista
function getSectionFromView(viewId) {
    switch(viewId) {
        case 'productos-aromas': return 1;
        case 'productos-bijouterie': return 2;
        case 'productos-humidificadores': return 3;
        default: return null;
    }
}

// ========== GESTIÓN DE PRODUCTOS ==========

// Cargar todos los productos
function loadAllProducts() {
    [1, 2, 3].forEach(section => {
        const items = loadSection(section);
        items.forEach(item => renderProductCard(item, section));
    });
}

// Cargar productos de una sección
function loadSection(section) {
    try {
        const key = SECTIONS[section].key;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error(`Error cargando sección ${section}:`, error);
        return [];
    }
}

// Guardar productos de una sección
function saveSection(section, items) {
    try {
        const key = SECTIONS[section].key;
        localStorage.setItem(key, JSON.stringify(items));
        updateStats();
    } catch (error) {
        console.error(`Error guardando sección ${section}:`, error);
    }
}

// Renderizar tarjeta de producto
function renderProductCard(item, section) {
    const container = document.getElementById(`list-${section}`);
    if (!container) return;
    
    // Evitar duplicados
    const existingCard = container.querySelector(`[data-id="${item.id}"]`);
    if (existingCard) existingCard.remove();
    
    const card = document.createElement('div');
    card.className = `product-card ${item.active === false ? 'inactive' : ''}`;
    card.setAttribute('data-id', item.id);
    
    const statusText = item.active === false ? 'Inactivo' : 'Activo';
    const statusClass = item.active === false ? 'status-inactive' : 'status-active';
    
    card.innerHTML = `
        <img src="${escapeAttr(item.photo)}" alt="${escapeAttr(item.name)}"
             onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\"><rect width=\"100%\" height=\"100%\" fill=\"%23f0f4ff\"/><text x=\"50%\" y=\"50%\" font-family=\"Montserrat\" font-size=\"10\" fill=\"%2394a3b8\" text-anchor=\"middle\" dy=\".3em\">Sin imagen</text></svg>'">
        <div class="product-info">
            <h4>${escapeHtml(item.name)}</h4>
            <div class="product-price">$${Number(item.price).toFixed(2)}</div>
            <div class="product-description">${escapeHtml(item.features || item.descripcion || '')}</div>
            <div class="product-meta">
                <span>Stock: ${item.qty || 0}</span>
                <span class="product-status ${statusClass}">
                    <i class="fas fa-circle" style="font-size: 8px;"></i>
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
                <button class="action-btn toggle-btn" onclick="toggleProduct(${section}, '${item.id}')">
                    <i class="fas fa-power-off"></i> ${item.active === false ? 'Activar' : 'Desactivar'}
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(card);
}

// Actualizar lista de productos de una sección
function refreshSectionList(section) {
    const container = document.getElementById(`list-${section}`);
    if (!container) return;
    
    container.innerHTML = '';
    const items = loadSection(section);
    items.forEach(item => renderProductCard(item, section));
}

// Abrir formulario para agregar/editar producto
function openProductForm(section, productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');
    
    // Resetear formulario
    form.reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('productActive').checked = true;
    
    // Configurar formulario
    document.getElementById('formSection').value = section;
    
    if (productId) {
        // Modo edición
        modalTitle.textContent = 'Editar Producto';
        document.getElementById('formId').value = productId;
        
        const items = loadSection(section);
        const product = items.find(p => p.id === productId);
        
        if (product) {
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDescription').value = product.features || product.descripcion || '';
            document.getElementById('productQuantity').value = product.qty || 1;
            document.getElementById('productActive').checked = product.active !== false;
            
            if (product.photo) {
                document.getElementById('photoPreview').src = product.photo;
                document.getElementById('photoPreview').style.display = 'block';
                document.querySelector('.upload-placeholder').style.display = 'none';
            }
        }
    } else {
        // Modo agregar
        modalTitle.textContent = `Agregar Producto - ${SECTIONS[section].name}`;
        document.getElementById('formId').value = '';
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Cerrar formulario
function closeProductForm() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Configurar eventos del formulario
function setupFormEvents() {
    const form = document.getElementById('productForm');
    const photoInput = document.getElementById('productPhoto');
    const photoPreview = document.getElementById('photoPreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    
    // Preview de imagen
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
    
    // Click en el área de upload
    document.querySelector('.upload-preview').addEventListener('click', function() {
        photoInput.click();
    });
    
    // Envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveProduct();
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('productModal').addEventListener('click', function(e) {
        if (e.target === this) closeProductForm();
    });
}

// Guardar producto
function saveProduct() {
    const section = Number(document.getElementById('formSection').value);
    const productId = document.getElementById('formId').value || Date.now().toString();
    
    const name = document.getElementById('productName').value.trim();
    const price = Number(document.getElementById('productPrice').value);
    const features = document.getElementById('productDescription').value.trim();
    const qty = Number(document.getElementById('productQuantity').value);
    const active = document.getElementById('productActive').checked;
    
    const fileInput = document.getElementById('productPhoto');
    const file = fileInput.files && fileInput.files[0];
    
    const photoPreview = document.getElementById('photoPreview');
    const currentPhoto = photoPreview.style.display === 'block' ? photoPreview.src : '';
    
    // Validaciones básicas
    if (!name || price <= 0) {
        alert('Por favor completa todos los campos requeridos correctamente');
        return;
    }
    
    const saveWithPhoto = (photoData) => {
        const items = loadSection(section);
        const existingIndex = items.findIndex(p => p.id === productId);
        
        const product = {
            id: productId,
            name,
            price,
            features,
            qty,
            photo: photoData,
            active,
            section
        };
        
        if (existingIndex >= 0) {
            items[existingIndex] = product;
        } else {
            items.push(product);
        }
        
        saveSection(section, items);
        refreshSectionList(section);
        closeProductForm();
        showNotification('Producto guardado exitosamente', 'success');
    };
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveWithPhoto(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        // Si no hay archivo nuevo, usar la foto existente
        saveWithPhoto(currentPhoto || '');
    }
}

// Editar producto
function editProduct(section, productId) {
    openProductForm(section, productId);
}

// Eliminar producto
function deleteProduct(section, productId) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    const items = loadSection(section);
    const filteredItems = items.filter(p => p.id !== productId);
    
    saveSection(section, filteredItems);
    refreshSectionList(section);
    showNotification('Producto eliminado', 'info');
}

// Activar/desactivar producto
function toggleProduct(section, productId) {
    const items = loadSection(section);
    const index = items.findIndex(p => p.id === productId);
    
    if (index >= 0) {
        items[index].active = items[index].active === false;
        saveSection(section, items);
        refreshSectionList(section);
        
        const action = items[index].active ? 'activado' : 'desactivado';
        showNotification(`Producto ${action}`, 'success');
    }
}

// Limpiar sección completa
function clearSection(section) {
    const sectionName = SECTIONS[section].name;
    if (!confirm(`¿Estás seguro de eliminar TODOS los productos de "${sectionName}"? Esta acción no se puede deshacer.`)) return;
    
    saveSection(section, []);
    refreshSectionList(section);
    showNotification('Sección limpiada', 'warning');
}

// ========== GESTIÓN DE IMÁGENES ==========

function setupImageEvents() {
    // Imagen de bienvenida
    const welcomeUpload = document.getElementById('welcome-image-upload');
    const welcomePreview = document.getElementById('welcome-image-preview');
    
    welcomeUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validar tamaño (2MB máximo)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es demasiado grande. El tamaño máximo es 2MB.');
            this.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            welcomePreview.src = e.target.result;
            // Aquí podrías guardar en localStorage o en el servidor
            localStorage.setItem('welcome_image', e.target.result);
            showNotification('Imagen de bienvenida actualizada', 'success');
        };
        reader.readAsDataURL(file);
    });
    
    // Cargar imagen guardada si existe
    const savedWelcomeImage = localStorage.getItem('welcome_image');
    if (savedWelcomeImage) {
        welcomePreview.src = savedWelcomeImage;
    }
}

function resetWelcomeImage() {
    if (confirm('¿Restaurar la imagen de bienvenida por defecto?')) {
        localStorage.removeItem('welcome_image');
        document.getElementById('welcome-image-preview').src = '';
        showNotification('Imagen restaurada', 'info');
    }
}

// ========== FUNCIONES UTILITARIAS ==========

// Actualizar estadísticas
function updateStats() {
    let totalProducts = 0;
    
    [1, 2, 3].forEach(section => {
        const items = loadSection(section);
        totalProducts += items.length;
    });
    
    const totalElement = document.getElementById('totalProducts');
    if (totalElement) {
        totalElement.textContent = totalProducts;
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos básicos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#00b894' : type === 'warning' ? '#fdcb6e' : type === 'danger' ? '#e17055' : '#4a8ef5'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    // Agregar estilos de animación si no existen
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Funciones de escape para seguridad
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Manejar logout
// Manejar logout desde el panel - VERSIÓN CORREGIDA
function handleLogout() {
    // Confirmar con el usuario
    if (confirm('¿Estás seguro de cerrar sesión del panel de administrador?')) {
        // 1. Limpiar TODOS los datos de sesión
        clearAdminSession();
        
        // 2. Mostrar notificación
        showNotification('Sesión cerrada exitosamente. Redirigiendo...', 'info');
        
        // 3. Redirigir al login después de un breve delay
        setTimeout(() => {
            // Redirigir a la página de login de administrador
            window.location.href = 'admin-login.html';
        }, 1500);
    }
}

// Función mejorada para limpiar sesión
function clearAdminSession() {
    // Eliminar todos los items relacionados con la sesión de admin
    const sessionItems = [
        'admin_session_token',
        'admin_session_expiry',
        'admin_user_name',
        'admin_last_login',
        'admin_remember',
        'admin_saved_user',
        'admin_login_attempts',
        'admin_lock_until',
        'admin_is_locked'
    ];
    
    sessionItems.forEach(item => {
        localStorage.removeItem(item);
    });
    
    // También limpiar sessionStorage por si acaso
    sessionStorage.removeItem('admin_redirect_url');
    
    console.log('✅ Sesión de administrador limpiada completamente');
}

// En la función checkAdminSession(), asegúrate que verifique correctamente:
function checkAdminSession() {
    const sessionToken = localStorage.getItem('admin_session_token');
    const sessionExpiry = localStorage.getItem('admin_session_expiry');
    
    // Si no hay sesión, redirigir al login
    if (!sessionToken || !sessionExpiry) {
        console.log('❌ No hay sesión activa, redirigiendo al login...');
        redirectToLogin();
        return false;
    }
    
    // Verificar si la sesión expiró
    const now = Date.now();
    const expiry = parseInt(sessionExpiry);
    
    if (now >= expiry) {
        console.log('❌ Sesión expirada, limpiando...');
        // Sesión expirada
        clearAdminSession();
        showSessionExpired();
        return false;
    }
    
    // Sesión válida
    console.log('✅ Sesión válida');
    updateAdminInfo();
    return true;
}
