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
    console.log('✅ Firebase inicializado en index.html');
  } catch (error) {
    console.error('Error Firebase:', error);
  }
}

// Inicializar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Firebase Authentication
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        showUserState(user);
      } else {
        showLoginState();
      }
    });
  }
  
  
  // Inicializar otras funcionalidades
  initializeDropdown();
  initializeCarousels();
  initializeCart();
  initializeYear();
  adjustHeaderSpacing();
  initializeSmoothScroll();
  initializeSubscription();
});

// Mostrar estado de usuario logueado (SOLO INICIAL)
async function showUserState(user) {
  console.log('🔐 Usuario logueado:', user.email);
  
  document.getElementById('loginState').style.display = 'none';
  document.getElementById('userState').style.display = 'block';

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
    
    document.getElementById('userAvatar').textContent = initial;
  } catch (error) {
    console.error('Error obteniendo datos usuario:', error);
    const fallback = (user.email && user.email.charAt(0)) ? user.email.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = fallback;
  }
}

// Mostrar estado de login
function showLoginState() {
  console.log('👤 Usuario no logueado');
  
  document.getElementById('loginState').style.display = 'block';
  document.getElementById('userState').style.display = 'none';
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

// Inicializar dropdown del catálogo
function initializeDropdown() {
  var dropdown = document.querySelector('.dropdown');
  if (!dropdown) return;
  
  var btn = dropdown.querySelector('.dropdown-button');
  var menu = dropdown.querySelector('.dropdown-menu');
  var closeTimer = null;

  function open() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    dropdown.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  
  function close() {
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  // Mostrar al entrar con el mouse
  dropdown.addEventListener('mouseenter', open);
  dropdown.addEventListener('mouseleave', function() {
    closeTimer = setTimeout(close, 180);
  });

  // Toggle por click
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) close(); else open();
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) {
      close();
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      close();
      btn.focus();
    }
  });

  // Cerrar al seleccionar una opción
  Array.prototype.forEach.call(menu.querySelectorAll('a'), function(link) {
    link.addEventListener('click', function() {
      close();
    });
  });
}

// Inicializar carruseles
function initializeCarousels() {
  const carousels = [
    { id: 'carouselAromas', statusId: 'carouselAromasStatus' },
    { id: 'carouselBijou', statusId: 'carouselBijouStatus' },
    { id: 'carouselHumid', statusId: 'carouselHumidStatus' }
  ];

  carousels.forEach(carousel => {
    const element = document.getElementById(carousel.id);
    if (!element) return;

    const slides = element.querySelectorAll('.slide');
    const status = document.getElementById(carousel.statusId);
    let current = 0;
    const total = slides.length;
    const interval = 5000;
    let timer = null;

    function show(index) {
      slides[current].classList.remove('active');
      current = (index + total) % total;
      slides[current].classList.add('active');
      if (status) {
        status.textContent = 'Imagen ' + (current + 1) + ' de ' + total;
      }
    }

    function next() {
      show(current + 1);
    }

    function start() {
      if (timer) clearInterval(timer);
      if (total > 1) {
        timer = setInterval(next, interval);
      }
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    start();
    
    element.addEventListener('mouseenter', stop);
    element.addEventListener('mouseleave', start);
    element.addEventListener('focusin', stop);
    element.addEventListener('focusout', start);

    // Soporte de teclado
    element.tabIndex = 0;
    element.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight') {
        stop();
        next();
        start();
      }
      if (e.key === 'ArrowLeft') {
        stop();
        show(current - 1);
        start();
      }
    });
  });
}

// Funciones del carrito
function initializeCart() {
  function updateCount() {
    var count = parseInt(localStorage.getItem('cartCount')) || 0;
    var el = document.getElementById('cart-count');
    if (!el) return;
    el.textContent = count;
    el.style.display = count ? 'flex' : 'none';
  }
  
  updateCount();
  
  window.addEventListener('storage', function(e) {
    if (e.key === 'cartCount') updateCount();
  });
}

// Año en footer
function initializeYear() {
  document.getElementById('year').textContent = new Date().getFullYear();
}

// Ajustar espacio para el header fijo
function adjustHeaderSpacing() {
  const header = document.querySelector('header');
  function adjustSpacing() {
    const h = header.offsetHeight;
    document.body.style.paddingTop = h + 'px';
  }
  
  window.addEventListener('resize', adjustSpacing);
  window.addEventListener('load', adjustSpacing);
  adjustSpacing();
}

// Scroll suave para enlaces internos
function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Inicializar suscripción
function initializeSubscription() {
  const form = document.getElementById('subscribe-form');
  const confirmDiv = document.getElementById('subscribe-confirm');
  const thanksDiv = document.getElementById('subscribe-thanks');
  
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('subscribe-email');
    const email = (input.value || '').trim();
    
    if (!email) return;
    
    document.getElementById('confirm-email').textContent = email;
    confirmDiv.style.display = 'block';
    thanksDiv.style.display = 'none';
  });

  document.getElementById('confirm-yes').addEventListener('click', function() {
    confirmDiv.style.display = 'none';
    thanksDiv.style.display = 'block';
    document.getElementById('subscribe-email').value = '';
    
    setTimeout(function() {
      thanksDiv.style.display = 'none';
    }, 3500);
  });

  document.getElementById('confirm-no').addEventListener('click', function() {
    confirmDiv.style.display = 'none';
  });
}