// js/cart.js - SISTEMA UNIFICADO DEL CARRITO (VERSIÓN FINAL CORREGIDA)

class CartSystem {
    constructor() {
        this.CART_KEY = 'bliss_cart';
        this.items = [];
        this.loadCart();
    }

    /* ==================== CORE ==================== */

    loadCart() {
        try {
            const saved = localStorage.getItem(this.CART_KEY);
            this.items = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error cargando carrito:', e);
            this.items = [];
        }
        this.updateCartUI();
    }

    saveCart() {
        localStorage.setItem(this.CART_KEY, JSON.stringify(this.items));
        this.updateCartUI();
    }

    updateCartUI() {
        this.updateCartCount();

        if (window.location.pathname.includes('carrito.html')) {
            this.renderCartPage();
        }
    }

    updateCartCount() {
        const count = this.getTotalItems();
        const badge = document.getElementById('cart-count');

        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    getTotalItems() {
        return this.items.reduce((t, i) => t + (i.quantity || 0), 0);
    }

    /* ==================== OPERACIONES ==================== */

    addProduct(product, quantity = 1) {
        const section = Number(product.section);

        const index = this.items.findIndex(i =>
            i.id === product.id && Number(i.section) === section
        );

        if (index > -1) {
            this.items[index].quantity += quantity;
        } else {
            this.items.push({
                ...product,
                section,
                quantity,
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart();
        this.showNotification('✅ Producto agregado al carrito');
    }

    removeProduct(productId, section) {
        section = Number(section);

        this.items = this.items.filter(i =>
            !(i.id === productId && Number(i.section) === section)
        );

        this.saveCart();
        this.showNotification('🗑️ Producto eliminado');
    }

    updateQuantity(productId, section, newQuantity) {
        section = Number(section);

        const item = this.items.find(i =>
            i.id === productId && Number(i.section) === section
        );

        if (!item) return;

        // 🔥 SI LLEGA A 0 → ELIMINAR
        if (newQuantity < 1) {
            this.items = this.items.filter(i =>
                !(i.id === productId && Number(i.section) === section)
            );

            this.saveCart();

            // 🔥 SI QUEDA VACÍO → MISMO EFECTO QUE VACIAR
            if (this.items.length === 0) {
                this.clearCart();
            }

            return;
        }

        item.quantity = newQuantity;
        this.saveCart();
    }

    clearCart() {
        this.items = [];
        this.saveCart();
        this.showNotification('🛒 Carrito vaciado');
    }

    /* ==================== CÁLCULOS ==================== */

    getSubtotal() {
        return this.items.reduce((t, i) => t + (i.price * i.quantity), 0);
    }

    calculateShipping() {
        return 0;
    }

    /* ==================== RENDER ==================== */

    async renderCartPage() {
        const container = document.getElementById('cart-items-container');
        const empty = document.getElementById('empty-cart-message');
        const clearBtn = document.getElementById('clear-cart-btn');
        const checkoutBtn = document.getElementById('go-to-checkout-btn');

        if (!container) return;

        if (this.items.length === 0) {
            if (empty) empty.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'none';
            if (checkoutBtn) checkoutBtn.style.display = 'none';
            this.updateSummary(0, 0);
            container.innerHTML = '';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        if (checkoutBtn) checkoutBtn.style.display = 'block';

        container.innerHTML = this.items.map(item => `
            <div class="cart-item">
                <img src="${item.image || 'imagenes/default-product.jpg'}" class="item-image">

                <div class="item-details">
                    <h4>${this.escapeHtml(item.name)}</h4>
                    <p class="item-category">${this.getCategoryName(item.section)}</p>
                    <p class="item-price">${this.formatPrice(item.price)} c/u</p>
                    <small id="stock-msg-${item.id}-${item.section}" style="color:#e74c3c; display:none;">
                        Stock máximo alcanzado
                    </small>
                </div>

                <div class="quantity-controls">
                    <button class="qty-btn"
                        onclick="cart.changeQuantity('${item.id}', ${item.section}, ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>

                    <span class="qty-value">${item.quantity}</span>

                    <button class="qty-btn"
                        id="plus-${item.id}-${item.section}"
                        onclick="cart.changeQuantity('${item.id}', ${item.section}, ${item.quantity + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>

                <div class="item-total">
                    ${this.formatPrice(item.price * item.quantity)}
                    <button class="remove-item"
                        onclick="cart.removeItem('${item.id}', ${item.section})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // 🔒 CONTROL DE STOCK
        this.items.forEach(async (item) => {
            if (typeof getProductStock === 'function') {
                const stock = await getProductStock(item.id);

                const btn = document.getElementById(`plus-${item.id}-${item.section}`);
                const msg = document.getElementById(`stock-msg-${item.id}-${item.section}`);

                if (!btn) return;

                if (item.quantity >= stock && stock > 0) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';

                    if (msg) msg.style.display = 'block';
                } else {
                    btn.disabled = false;
                    if (msg) msg.style.display = 'none';
                }
            }
        });

        const subtotal = this.getSubtotal();
        this.updateSummary(subtotal, "A coordinar");
    }

    updateSummary(subtotal, shipping) {
        const total = subtotal;

        const s = document.getElementById('summary-subtotal');
        const sh = document.getElementById('summary-shipping');
        const t = document.getElementById('summary-total');

        if (s) s.textContent = this.formatPrice(subtotal);
        if (sh) sh.textContent = shipping;
        if (t) t.textContent = this.formatPrice(total);
    }

    /* ==================== HELPERS ==================== */

    formatPrice(value) {
        const number = Number(value) || 0;

        return number.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS'
        });
    }

    getCategoryName(section) {
        return {
            1: 'Producto Aromático',
            2: 'Bijouterie',
            3: 'Humidificador'
        }[section] || 'Producto';
    }

    escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    showNotification(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    /* ==================== API ==================== */

    changeQuantity(id, section, qty) {
        this.updateQuantity(id, section, qty);
    }

    removeItem(id, section) {
        if (confirm('¿Eliminar este producto del carrito?')) {
            this.removeProduct(id, section);

            if (this.items.length === 0) {
                this.clearCart();
            } else {
                this.updateCartUI();
            }
        }
    }

    clearAll() {
        if (confirm('¿Vaciar todo el carrito?')) {
            this.clearCart();
        }
    }
}

/* ==================== INIT ==================== */

const cart = new CartSystem();

window.addEventListener('storage', e => {
    if (e.key === cart.CART_KEY) cart.loadCart();
});

document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => cart.clearAll());
});