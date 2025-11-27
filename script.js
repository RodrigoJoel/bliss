
// Verificar estado de autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    initializeCarousel();
    initializeOtherFeatures();
});

// Función para verificar si el usuario está logueado
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Usuario logueado - actualizar UI
            updateUIForLoggedInUser(user);
        } else {
            // Usuario no logueado - mostrar formulario de login normal
            updateUIForLoggedOutUser();
        }
    });
}

// Actualizar UI cuando el usuario está logueado
function updateUIForLoggedInUser(user) {
    const loginForm = document.getElementById('loginForm');
    const userMenu = document.getElementById('userMenu');
    
    if (loginForm) loginForm.style.display = 'none';
    if (userMenu) {
        userMenu.style.display = 'block';
        // Aquí puedes mostrar información del usuario si quieres
    }
    
    // Opcional: Obtener datos adicionales del usuario desde Firestore
    getUserProfileData(user.uid);
}

// Actualizar UI cuando el usuario no está logueado
function updateUIForLoggedOutUser() {
    const loginForm = document.getElementById('loginForm');
    const userMenu = document.getElementById('userMenu');
    
    if (loginForm) loginForm.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
}

// Obtener datos del perfil del usuario desde Firestore
async function getUserProfileData(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            const userData = doc.data();
            console.log('Datos del usuario:', userData);
            // Aquí puedes usar los datos del usuario si los necesitas
        }
    } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
    }
}

// Función de login con Firebase
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Iniciando sesión...';
    submitBtn.disabled = true;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Login exitoso
        showLoginMessage('¡Login exitoso! Redirigiendo...', 'success');
        
        // Redirigir después de 1 segundo
        setTimeout(() => {
            window.location.href = 'dashboard.html'; // Cambia por tu página de destino
        }, 1000);
        
    } catch (error) {
        console.error('Error en login:', error);
        
        let errorMessage = 'Error al iniciar sesión. ';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado. Por favor, registrate.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
        } else {
            errorMessage += error.message;
        }
        
        showLoginMessage(errorMessage, 'error');
    } finally {
        // Restaurar botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Función para cerrar sesión
function handleLogout() {
    auth.signOut().then(() => {
        showLoginMessage('Sesión cerrada correctamente', 'success');
        // La UI se actualizará automáticamente por checkAuthState
    }).catch((error) => {
        console.error('Error cerrando sesión:', error);
        showLoginMessage('Error al cerrar sesión', 'error');
    });
}

// Mostrar mensajes de login
function showLoginMessage(message, type) {
    // Crear o actualizar elemento de mensaje
    let messageDiv = document.getElementById('login-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'login-message';
        messageDiv.style.padding = '10px';
        messageDiv.style.margin = '10px 0';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.textAlign = 'center';
        document.getElementById('loginForm').prepend(messageDiv);
    }
    
    messageDiv.textContent = message;
    messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    messageDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Evita que el header fijo tape el contenido: ajusta padding-top dinámicamente
(function(){
  const header = document.querySelector('header');
  function adjustSpacing(){
    const h = header.offsetHeight;
    document.body.style.paddingTop = h + 'px';
  }
  window.addEventListener('resize', adjustSpacing);
  // ejecutar después de que el layout esté listo
  window.addEventListener('load', adjustSpacing);
  adjustSpacing();
})();

// año en footer
document.getElementById('year').textContent = new Date().getFullYear();

// Función para el formulario de suscripción
function handleSubscribe(e){
  e.preventDefault();
  var input = document.getElementById('subscribe-email');
  var email = (input.value || '').trim();
  if(!email) return;
  document.getElementById('confirm-email').textContent = email;
  document.getElementById('subscribe-confirm').style.display = 'block';
  document.getElementById('subscribe-thanks').style.display = 'none';
}

document.getElementById('confirm-yes').addEventListener('click', function(){
  // aquí se podría enviar el email al servidor (fetch) si se desea
  document.getElementById('subscribe-confirm').style.display = 'none';
  document.getElementById('subscribe-thanks').style.display = 'block';
  // limpiar el input después de la confirmación
  document.getElementById('subscribe-email').value = '';
  // ocultar el mensaje de agradecimiento después de unos segundos
  setTimeout(function(){
    document.getElementById('subscribe-thanks').style.display = 'none';
  }, 3500);
});

document.getElementById('confirm-no').addEventListener('click', function(){
  document.getElementById('subscribe-confirm').style.display = 'none';
});

// Carrusel de productos
function initializeCarousel(){
  const track = document.querySelector('.carousel-track');
  const carouselContainer = document.querySelector('.carousel-container');
  const cards = Array.from(document.querySelectorAll('.product-card'));
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const dotsContainer = document.querySelector('.carousel-dots');

  if (!track || !cards.length) return;

  let cardsPerView = 4;
  let currentIndex = 0;
  let autoSlide;

  function updateCardsPerView(){
    const w = window.innerWidth;
    if(w <= 480) cardsPerView = 1;
    else if(w <= 768) cardsPerView = 2;
    else if(w <= 1024) cardsPerView = 3;
    else cardsPerView = 4;
    createDots();
    goToSlide(0);
  }

  function createDots(){
    const total = Math.ceil(cards.length / cardsPerView);
    dotsContainer.innerHTML = '';
    for(let i=0;i<total;i++){
      const d = document.createElement('div');
      d.className = 'dot' + (i===0 ? ' active' : '');
      d.addEventListener('click', ()=>{ goToSlide(i) });
      dotsContainer.appendChild(d);
    }
  }

  function goToSlide(index){
    const total = Math.ceil(cards.length / cardsPerView);
    currentIndex = Math.max(0, Math.min(index, total-1));
    const shiftPercent = (currentIndex * 100);
    track.style.transform = `translateX(-${shiftPercent}%)`;
    updateActiveDot();
    resetAuto();
  }

  function updateActiveDot(){
    const dots = Array.from(document.querySelectorAll('.dot'));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }

  function nextSlide(){
    const total = Math.ceil(cards.length / cardsPerView);
    currentIndex = (currentIndex + 1) % total;
    goToSlide(currentIndex);
  }

  function prevSlide(){
    const total = Math.ceil(cards.length / cardsPerView);
    currentIndex = (currentIndex - 1 + total) % total;
    goToSlide(currentIndex);
  }

  if (prevBtn) prevBtn.addEventListener('click', ()=>{ prevSlide(); });
  if (nextBtn) nextBtn.addEventListener('click', ()=>{ nextSlide(); });

  function startAuto(){ 
    if (cards.length > cardsPerView) {
      autoSlide = setInterval(nextSlide, 10000); 
    }
  }
  function resetAuto(){ clearInterval(autoSlide); startAuto(); }

  // agregar comportamiento botones "Agregar" (demo)
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      const card = e.target.closest('.product-card');
      const name = card.getAttribute('data-name') || card.querySelector('.product-name').textContent;
      alert(name + " agregado al carrito (demo).");
    });
  });

  // responsive init
  window.addEventListener('resize', updateCardsPerView);
  updateCardsPerView();
  startAuto();
}

// Inicializar otras características
function initializeOtherFeatures() {
  // Suavizado para enlaces internos
  document.querySelectorAll('nav a').forEach(a=>{
    a.addEventListener('click', function(e){
      const href = this.getAttribute('href');
      if(href && href.startsWith('#')){
        e.preventDefault();
        const t = document.querySelector(href);
        if(t) t.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
}

// Función para redirigir al registro
function redirectToRegister() {
    window.open('register.html', '_blank', 'width=520,height=700,noopener');
}