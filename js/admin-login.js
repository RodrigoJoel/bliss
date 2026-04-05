/**
 * Bliss - Panel de Administración
 * Lógica de Autenticación con Firebase
 */

const SECURITY_CONFIG = {
    maxAttempts: 5,
    lockTime: 15 * 60 * 1000,
    sessionDuration: 8 * 60 * 60 * 1000
};

let loginAttempts = 0;
let isLocked = false;
let lockUntil = 0;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    loadLoginState();
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    checkRememberMe();
});

// --- FUNCIONES DEL MODAL (Lo que faltaba) ---

function showForgotPassword(e) {
    if(e) e.preventDefault();
    const modal = document.getElementById('forgotModal');
    modal.style.display = 'flex';
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    modal.style.display = 'none';
    document.getElementById('resetMessage').innerText = "";
}

async function sendResetEmail() {
    const emailInput = document.getElementById('resetEmail');
    const msg = document.getElementById('resetMessage');
    const email = emailInput.value.trim();
    const targetEmail = email ? email : "blissrcia@gmail.com";

    try {
        await firebase.auth().sendPasswordResetEmail(targetEmail);
        msg.innerText = `Enlace enviado a ${targetEmail}`;
        msg.style.color = "#009900";
        setTimeout(closeForgotModal, 3000);
    } catch (error) {
        msg.innerText = "Error: " + error.message;
        msg.style.color = "red";
    }
}

// --- LÓGICA DE LOGIN ---

async function handleLogin(e) {
    e.preventDefault();
    
    if (isLocked) {
        const remainingTime = Math.ceil((lockUntil - Date.now()) / 60000);
        if (remainingTime > 0) {
            showError(`Bloqueado. Intenta en ${remainingTime} min.`);
            return;
        } else {
            clearLock();
        }
    }
    
    const email = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    setLoadingState(true);

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        handleSuccessfulLogin(userCredential.user, rememberMe);
    } catch (error) {
        let message = 'Correo o contraseña incorrectos';
        if (error.code === 'auth/too-many-requests') message = 'Demasiados intentos. Bloqueado.';
        handleFailedLogin(message);
    }
}

function handleSuccessfulLogin(user, rememberMe) {
    clearLock();
    localStorage.setItem('admin_remember', rememberMe.toString());
    if (rememberMe) localStorage.setItem('admin_saved_user', user.email);
    
    localStorage.setItem('admin_session_token', 'fb_' + user.uid);
    localStorage.setItem('admin_session_expiry', (Date.now() + SECURITY_CONFIG.sessionDuration).toString());
    localStorage.setItem('admin_user_name', user.email.split('@')[0]);
    
    showSuccess('¡Acceso concedido!');
    setTimeout(() => { window.location.href = 'admin.html'; }, 1500);
}

function handleFailedLogin(message) {
    setLoadingState(false);
    loginAttempts++;
    saveLoginState();
    if (loginAttempts >= SECURITY_CONFIG.maxAttempts) {
        isLocked = true;
        lockUntil = Date.now() + SECURITY_CONFIG.lockTime;
        saveLoginState();
        showError("Máximos intentos alcanzados.");
    } else {
        showError(`${message}. Quedan ${SECURITY_CONFIG.maxAttempts - loginAttempts}`);
    }
}

// --- UTILIDADES ---

function setLoadingState(isLoading) {
    const btn = document.getElementById('loginButton');
    btn.disabled = isLoading;
    btn.querySelector('.loading-spinner').style.display = isLoading ? 'block' : 'none';
    btn.querySelector('span').style.opacity = isLoading ? '0.5' : '1';
}

function togglePassword() {
    const input = document.getElementById('adminPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function checkRememberMe() {
    if (localStorage.getItem('admin_remember') === 'true') {
        document.getElementById('rememberMe').checked = true;
        document.getElementById('adminUsername').value = localStorage.getItem('admin_saved_user') || "";
    }
}

function saveLoginState() {
    localStorage.setItem('admin_login_attempts', loginAttempts);
    localStorage.setItem('admin_lock_until', lockUntil);
}

function loadLoginState() {
    loginAttempts = parseInt(localStorage.getItem('admin_login_attempts') || "0");
    lockUntil = parseInt(localStorage.getItem('admin_lock_until') || "0");
    if (lockUntil && Date.now() < lockUntil) isLocked = true;
}

function clearLock() {
    loginAttempts = 0; isLocked = false; lockUntil = 0;
    saveLoginState();
}

function showError(m) { createToast(m, '#ffe6e6', '#cc0000', 'fa-exclamation-circle'); }
function showSuccess(m) { createToast(m, '#e6ffe6', '#009900', 'fa-check-circle'); }

function createToast(message, bgColor, textColor, icon) {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: ${textColor}; padding: 15px 25px; border-radius: 8px; z-index: 9999; display: flex; align-items: center; gap: 10px; animation: slideIn 0.4s ease forwards;`;
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}