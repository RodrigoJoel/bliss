// Credenciales de administrador
// IMPORTANTE: Cambia estas credenciales antes de subir a producción
const ADMIN_CREDENTIALS = [
    {
        username: 'admin',
        password: 'BlissAdmin2024!', // Contraseña fuerte por defecto
        name: 'Administrador Principal'
    },
    {
        username: 'staff',
        password: 'BlissStaff2024!', // Para personal autorizado
        name: 'Miembro del Staff'
    }
];

// Configuración de seguridad
const SECURITY_CONFIG = {
    maxAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutos en milisegundos
    sessionDuration: 8 * 60 * 60 * 1000 // 8 horas
};

// Estado de login
let loginAttempts = 0;
let isLocked = false;
let lockUntil = 0;

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya está logueado
   // checkExistingSession();
    
    // Cargar intentos previos desde localStorage
   // loadLoginState();

    // Configurar formulario
    const loginForm = document.getElementById('adminLoginForm');
    const loginButton = document.getElementById('loginButton');
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Configurar recordarme
    const rememberMe = document.getElementById('rememberMe');
    const savedRemember = localStorage.getItem('admin_remember') === 'true';
    if (rememberMe) {
        rememberMe.checked = savedRemember;
        if (savedRemember) {
            const savedUser = localStorage.getItem('admin_saved_user');
            if (savedUser) {
                document.getElementById('adminUsername').value = savedUser;
            }
        }
    }
    
    // Configurar autocompletar con Enter
    document.getElementById('adminUsername').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('adminPassword').focus();
        }
    });
    
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

// Cargar estado de login desde localStorage
function loadLoginState() {
    const savedAttempts = localStorage.getItem('admin_login_attempts');
    const savedLockUntil = localStorage.getItem('admin_lock_until');
    const savedIsLocked = localStorage.getItem('admin_is_locked');
    
    if (savedAttempts) {
        loginAttempts = parseInt(savedAttempts);
    }
    
    if (savedLockUntil) {
        lockUntil = parseInt(savedLockUntil);
        if (Date.now() < lockUntil) {
            isLocked = true;
        } else {
            // Si el tiempo de bloqueo ya pasó, limpiar
            clearLock();
        }
    }
    
    if (savedIsLocked === 'true' && Date.now() < lockUntil) {
        isLocked = true;
    }
}

// Guardar estado de login
function saveLoginState() {
    localStorage.setItem('admin_login_attempts', loginAttempts.toString());
    localStorage.setItem('admin_lock_until', lockUntil.toString());
    localStorage.setItem('admin_is_locked', isLocked.toString());
}

// Limpiar bloqueo
function clearLock() {
    loginAttempts = 0;
    isLocked = false;
    lockUntil = 0;
    saveLoginState();
}

// Verificar sesión existente
function checkExistingSession() {
    const sessionToken = localStorage.getItem('admin_session_token');
    const sessionExpiry = localStorage.getItem('admin_session_expiry');
    
    if (sessionToken && sessionExpiry) {
        const now = Date.now();
        const expiry = parseInt(sessionExpiry);
        
        if (now < expiry) {
            // Sesión válida, redirigir al panel
            window.location.href = 'admin.html';
        } else {
            // Sesión expirada, limpiar
            localStorage.removeItem('admin_session_token');
            localStorage.removeItem('admin_session_expiry');
            localStorage.removeItem('admin_user_name');
        }
    }
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    if (isLocked) {
        const remainingTime = Math.ceil((lockUntil - Date.now()) / 60000); // En minutos
        showError(`Cuenta bloqueada. Intenta nuevamente en ${remainingTime} minutos.`);
        return;
    }
    
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginButton = document.getElementById('loginButton');
    
    // Validaciones básicas
    if (!username || !password) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    // Mostrar loading
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    loginButton.querySelector('span').style.opacity = '0.5';
    loginButton.querySelector('.loading-spinner').style.display = 'block';
    
    // Simular delay de red (en producción esto sería una petición real)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Buscar usuario
    const user = ADMIN_CREDENTIALS.find(u => u.username === username);
    
    if (!user) {
        handleFailedLogin('Usuario no encontrado');
        return;
    }
    
    if (user.password !== password) {
        handleFailedLogin('Contraseña incorrecta');
        return;
    }
    
    // Login exitoso
    handleSuccessfulLogin(user, rememberMe);
}

// Manejar login exitoso
function handleSuccessfulLogin(user, rememberMe) {
    // Limpiar intentos fallidos
    clearLock();
    
    // Guardar preferencia de "recordarme"
    localStorage.setItem('admin_remember', rememberMe.toString());
    if (rememberMe) {
        localStorage.setItem('admin_saved_user', user.username);
    } else {
        localStorage.removeItem('admin_saved_user');
    }
    
    // Crear sesión
    const sessionToken = generateSessionToken();
    const sessionExpiry = Date.now() + SECURITY_CONFIG.sessionDuration;
    
    localStorage.setItem('admin_session_token', sessionToken);
    localStorage.setItem('admin_session_expiry', sessionExpiry.toString());
    localStorage.setItem('admin_user_name', user.name);
    localStorage.setItem('admin_last_login', new Date().toISOString());
    
    // Mostrar mensaje de éxito
    showSuccess('¡Acceso exitoso! Redirigiendo...');
    
    // Redirigir después de 1.5 segundos
    setTimeout(() => {
        window.location.href = 'admin.html';
    }, 1500);
}

// Manejar login fallido
function handleFailedLogin(message) {
    const loginButton = document.getElementById('loginButton');
    
    // Restaurar botón
    loginButton.classList.remove('loading');
    loginButton.disabled = false;
    loginButton.querySelector('span').style.opacity = '1';
    loginButton.querySelector('.loading-spinner').style.display = 'none';
    
    // Incrementar intentos
    loginAttempts++;
    
    if (loginAttempts >= SECURITY_CONFIG.maxAttempts) {
        // Bloquear cuenta
        isLocked = true;
        lockUntil = Date.now() + SECURITY_CONFIG.lockTime;
        saveLoginState();
        
        const remainingTime = Math.ceil(SECURITY_CONFIG.lockTime / 60000);
        showError(`Demasiados intentos fallidos. Cuenta bloqueada por ${remainingTime} minutos.`);
    } else {
        const remainingAttempts = SECURITY_CONFIG.maxAttempts - loginAttempts;
        showError(`${message}. Intentos restantes: ${remainingAttempts}`);
        saveLoginState();
    }
}

// Generar token de sesión
function generateSessionToken() {
    return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Mostrar error
function showError(message) {
    // Crear elemento de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Estilos
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ffe6e6;
        border: 1px solid #ff9999;
        border-radius: 8px;
        padding: 15px 20px;
        color: #cc0000;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
}

// Mostrar éxito
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e6ffe6;
        border: 1px solid #99ff99;
        border-radius: 8px;
        padding: 15px 20px;
        color: #009900;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Alternar visibilidad de contraseña
function togglePassword() {
    const passwordInput = document.getElementById('adminPassword');
    const toggleIcon = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
        toggleIcon.title = 'Ocultar contraseña';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
        toggleIcon.title = 'Mostrar contraseña';
    }
}

// Mostrar modal de contraseña olvidada
function showForgotPassword() {
    const modal = document.getElementById('forgotModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('forgotModal');
    if (e.target === modal) {
        closeForgotModal();
    }
});

// Cerrar modal con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeForgotModal();
    }
});

// Agregar estilos de animación
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}