// ==================== SISTEMA DE CHECKOUT ====================
class CheckoutSystem {
    constructor() {
        this.currentStep = 1;
        this.orderData = {};
        this.customerData = {};
        this.shippingCost = 0;
        this.currentUser = null;
        this.init();
    }

    formatPrice(value) {
        const number = Number(value) || 0;
        return number.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        });
    }

    init() {
        this.loadCartItems();
        this.setupEventListeners();
        this.showStep(1);
        this.loadUserData();
    }

    // Cargar datos del usuario logueado y precargar formulario
    loadUserData() {
        if (typeof firebase === 'undefined') return;

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                try {
                    const db = firebase.firestore();
                    const userDoc = await db.collection('users').doc(user.uid).get();

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                        if (fullName) document.getElementById('customerName').value = fullName;
                        if (userData.email) document.getElementById('customerEmail').value = userData.email;
                        if (userData.phone) document.getElementById('customerPhone').value = userData.phone;
                    } else {
                        if (user.email) document.getElementById('customerEmail').value = user.email;
                    }
                } catch (e) {
                    console.warn('No se pudieron precargar los datos del usuario:', e);
                }
            }
        });
    }

    loadCartItems() {
        const orderItems = document.getElementById('orderItems');
        const cartItems = cart.items;

        if (cartItems.length === 0) {
            orderItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito está vacío</p>
                    <a href="index.html" class="btn-primary">Volver a comprar</a>
                </div>
            `;
            return;
        }

        orderItems.innerHTML = cartItems.map(item => `
            <div class="order-item">
                <div class="order-item-image">
                    <img src="${item.image || 'imagenes/default-product.jpg'}" 
                         alt="${item.name}"
                         onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><rect width=\"100%\" height=\"100%\" fill=\"%23f3f4f6\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"12\" fill=\"%239ca3af\" text-anchor=\"middle\" dy=\".3em\">Sin imagen</text></svg>'">
                </div>
                <div class="order-item-details">
                    <h4>${item.name}</h4>
                    <p class="order-item-category">${cart.getCategoryName(item.section)}</p>
                    <p class="order-item-price">${this.formatPrice(item.price)} c/u</p>
                </div>
                <div class="order-item-quantity">x${item.quantity}</div>
                <div class="order-item-total">${this.formatPrice(item.price * item.quantity)}</div>
            </div>
        `).join('');

        this.updateTotals();
    }

    updateTotals() {
        const subtotal = Number(cart.getSubtotal());
        document.getElementById('orderSubtotal').textContent = this.formatPrice(subtotal);
        document.getElementById('orderShipping').textContent = "A coordinar";
        document.getElementById('orderTotal').textContent = this.formatPrice(subtotal);
    }

    setupEventListeners() {
        document.querySelectorAll('input[name="delivery"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const shippingAddress = document.getElementById('shippingAddress');
                shippingAddress.style.display = e.target.value === 'shipping' ? 'block' : 'none';
                this.updateTotals();
            });
        });

        document.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const transferInfo = document.getElementById('transferInfo');
                transferInfo.style.display = e.target.value === 'transfer' ? 'block' : 'none';
            });
        });

        document.getElementById('checkoutForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processOrder();
        });
    }

    showStep(stepNumber) {
        document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) currentStep.classList.add('active');
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            stepEl.classList.remove('active');
            if (index + 1 <= stepNumber) stepEl.classList.add('active');
        });
        this.currentStep = stepNumber;
    }

    nextStep(step) {
        if (this.currentStep === 1 && !this.validateStep1()) return;
        if (this.currentStep === 2 && !this.validateStep2()) return;
        this.showStep(step);
    }

    prevStep(step) { this.showStep(step); }

    validateStep1() {
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (!name || !email || !phone) {
            this.showError('Por favor completa todos los campos obligatorios');
            return false;
        }
        if (!this.validateEmail(email)) {
            this.showError('Por favor ingresa un email válido');
            return false;
        }

        this.customerData = {
            name, email, phone,
            notes: document.getElementById('customerNotes').value.trim()
        };
        return true;
    }

    validateStep2() {
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;

        if (deliveryMethod === 'shipping') {
            const street = document.getElementById('shippingStreet').value.trim();
            const number = document.getElementById('shippingNumber').value.trim();
            const city = document.getElementById('shippingCity').value.trim();
            const zip = document.getElementById('shippingZip').value.trim();

            if (!street || !number || !city || !zip) {
                this.showError('Por favor completa todos los campos de dirección');
                return false;
            }
            this.orderData.shippingAddress = `${street} ${number}, ${city} (CP: ${zip})`;
        }

        this.orderData.deliveryMethod = deliveryMethod === 'pickup' ? 'Retiro en local' : 'Envío a domicilio';
        return true;
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async processPayment() {
        if (cart.items.length === 0) {
            this.showError('Tu carrito está vacío');
            return;
        }

        if (!this.validateStep1() || !this.validateStep2()) return;

        const paymentMethod = document.querySelector('input[name="payment"]:checked');
        if (!paymentMethod) {
            this.showError('Por favor selecciona un método de pago');
            return;
        }

        this.orderData.paymentMethod = paymentMethod.value;
        this.orderData.items = JSON.parse(JSON.stringify(cart.items));
        this.orderData.subtotal = Number(cart.getSubtotal());
        this.orderData.shippingCost = "A coordinar";
        this.orderData.total = this.orderData.subtotal;
        this.orderData.orderNumber = this.generateOrderNumber();

        this.showLoading();

        try {
            if (paymentMethod.value === 'mercadopago') {
                await this.processMercadoPago();
            } else {
                await this.processOrder();
            }
        } catch (error) {
            console.error('Error procesando pago:', error);
            this.showError('Error al procesar el pago. Intenta nuevamente.');
            this.hideLoading();
        }
    }

    // ==================== MERCADO PAGO ====================
    async processMercadoPago() {
        try {
            const response = await fetch('http://localhost:3000/crear-preferencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: this.orderData.items.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    customerData: this.customerData,
                    orderData: { orderNumber: this.orderData.orderNumber }
                })
            });

            if (!response.ok) throw new Error('Error al conectar con el servidor de pagos');

            const data = await response.json();
            await this.saveOrderToFirebase();
            window.location.href = data.init_point;

        } catch (error) {
            console.error('Error con Mercado Pago:', error);
            this.showError('No se pudo conectar con Mercado Pago. Intenta nuevamente.');
            this.hideLoading();
        }
    }

    // ==================== PROCESAR ORDEN ====================
    async processOrder() {
        try {
            const orderId = await this.saveOrderToFirebase();
            await emailService.sendOrderConfirmation(this.orderData, this.customerData);
            await emailService.sendAdminNotification(this.orderData, this.customerData);
            cart.clearCart();
            this.showConfirmation(orderId);
        } catch (error) {
            console.error('Error procesando orden:', error);
            this.showError('Error al procesar la orden. Intenta nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    // ==================== GUARDAR EN FIREBASE ====================
    async saveOrderToFirebase() {
        if (!firebase.apps.length) throw new Error('Firebase no está inicializado');

        const db = firebase.firestore();
        const ordersRef = db.collection('orders');

        const orderData = {
            ...this.orderData,
            items: this.orderData.items.map(item => ({
                id: item.id || '',
                name: item.name || '',
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 0,
                section: item.section || ''
            })),
            ...this.customerData,
            userId: this.currentUser ? this.currentUser.uid : null,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await ordersRef.add(orderData);
        return docRef.id;
    }

    generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `BLISS-${year}${month}${day}-${random}`;
    }

    showConfirmation(orderId) {
        this.showStep(4);
        document.getElementById('orderNumber').textContent = this.orderData.orderNumber;
        document.getElementById('finalTotal').textContent = this.formatPrice(this.orderData.total);
        document.getElementById('paymentMethod').textContent = this.getPaymentMethodName(this.orderData.paymentMethod);
        document.getElementById('deliveryMethod').textContent = this.orderData.deliveryMethod;
        document.getElementById('confirmationMessage').textContent = `Hemos enviado los detalles a ${this.customerData.email}`;
    }

    getPaymentMethodName(method) {
        const methods = {
            mercadopago: 'Mercado Pago',
            transfer: 'Transferencia bancaria',
            cash: 'Efectivo en local'
        };
        return methods[method] || method;
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.id = 'checkoutLoading';
        loading.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div><p>Procesando tu pedido...</p></div>`;
        loading.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;`;
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('checkoutLoading');
        if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'checkout-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
        errorDiv.style.cssText = `position:fixed;top:20px;right:20px;background:#fee2e2;color:#dc2626;padding:15px 20px;border-radius:8px;display:flex;align-items:center;gap:10px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
        document.body.appendChild(errorDiv);
        setTimeout(() => { if (errorDiv.parentNode) errorDiv.parentNode.removeChild(errorDiv); }, 5000);
    }

    printOrder() { window.print(); }
}

// FUNCIONES GLOBALES
function nextStep(step) { if (typeof checkout !== 'undefined') checkout.nextStep(step); }
function prevStep(step) { if (typeof checkout !== 'undefined') checkout.prevStep(step); }
function processPayment() { if (typeof checkout !== 'undefined') checkout.processPayment(); }
function printOrder() { if (typeof checkout !== 'undefined') checkout.printOrder(); }

document.addEventListener('DOMContentLoaded', function () {
    if (cart.items.length === 0) {
        window.location.href = 'index.html';
        return;
    }
    window.checkout = new CheckoutSystem();
});