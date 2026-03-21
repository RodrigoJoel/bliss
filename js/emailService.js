// ==================== SERVICIO DE EMAILS ====================
class EmailService {
    constructor() {
        if (typeof emailjs !== 'undefined') {
            emailjs.init("A6soXH6pxsjEj0y-0");
        }
    }

    // Formatear precio
    formatPrice(value) {
        const number = Number(value) || 0;
        return number.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        });
    }

    // ==================== EMAIL AL CLIENTE ====================
    async sendOrderConfirmation(orderData, customerData) {

        const orderItemsHTML = orderData.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${this.formatPrice(item.price)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${this.formatPrice(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const clienteHTML = `
            <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">🌿 ¡Gracias por tu compra!</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9;">Tu pedido fue confirmado en Bliss</p>
                </div>

                <!-- Cuerpo -->
                <div style="padding: 30px 20px;">
                    <p style="color: #374151;">Hola <strong>${customerData.name}</strong>,</p>
                    <p style="color: #6b7280;">Recibimos tu pedido y lo estamos procesando. Acá te dejamos el resumen:</p>

                    <!-- Detalles de la orden -->
                    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 4px 0; color: #374151;"><strong>N° de orden:</strong> ${orderData.orderNumber}</p>
                        <p style="margin: 4px 0; color: #374151;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
                        <p style="margin: 4px 0; color: #374151;"><strong>Método de pago:</strong> ${orderData.paymentMethod === 'mercadopago' ? 'Mercado Pago' : orderData.paymentMethod === 'transfer' ? 'Transferencia bancaria' : 'Efectivo en local'}</p>
                        <p style="margin: 4px 0; color: #374151;"><strong>Entrega:</strong> ${orderData.deliveryMethod}</p>
                        ${orderData.shippingAddress ? `<p style="margin: 4px 0; color: #374151;"><strong>Dirección:</strong> ${orderData.shippingAddress}</p>` : ''}
                    </div>

                    <!-- Tabla de productos -->
                    <h3 style="color: #1a1a2e;">Productos:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 10px; text-align: left; color: #374151;">Producto</th>
                                <th style="padding: 10px; text-align: center; color: #374151;">Cant.</th>
                                <th style="padding: 10px; text-align: right; color: #374151;">Precio</th>
                                <th style="padding: 10px; text-align: right; color: #374151;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderItemsHTML}
                        </tbody>
                    </table>

                    <!-- Totales -->
                    <div style="text-align: right; margin-top: 16px; padding-top: 16px; border-top: 2px solid #f3f4f6;">
                        <p style="color: #6b7280; margin: 4px 0;">Subtotal: ${this.formatPrice(orderData.subtotal)}</p>
                        <p style="color: #6b7280; margin: 4px 0;">Envío: A coordinar</p>
                        <p style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 8px 0;">Total: ${this.formatPrice(orderData.total)}</p>
                    </div>

                    <!-- Nota -->
                    <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 24px;">
                        <p style="margin: 0; color: #374151;">📦 Tu pedido será procesado dentro de las próximas <strong>24 horas</strong>. Te contactaremos para coordinar la entrega.</p>
                    </div>

                    <p style="margin-top: 24px; color: #6b7280;">
                        ¿Tenés preguntas? Escribinos a 
                        <a href="mailto:blissrcia@gmail.com" style="color: #667eea;">blissrcia@gmail.com</a>
                    </p>
                </div>

                <!-- Footer -->
                <div style="background: #f3f4f6; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2024 Bliss. Todos los derechos reservados.</p>
                    <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">Av. Sarmiento 318, Resistencia, Chaco</p>
                </div>
            </div>
        `;

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    "service_9cm0mf4",
                    "template_7gsgw9h",
                    {
                        to_email: customerData.email,
                        subject: `✅ Confirmación de pedido Bliss - ${orderData.orderNumber}`,
                        message: clienteHTML
                    }
                );
                console.log('✅ Email enviado al cliente');
            }
            return true;
        } catch (error) {
            console.error('❌ Error enviando email al cliente:', error);
            return false;
        }
    }

    // ==================== EMAIL AL VENDEDOR ====================
    async sendAdminNotification(orderData, customerData) {

        const orderItemsHTML = orderData.items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">${this.formatPrice(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const adminHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

                <!-- Header -->
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">🛒 NUEVO PEDIDO RECIBIDO</h2>
                    <p style="margin: 6px 0 0; opacity: 0.9;">N° ${orderData.orderNumber} — ${new Date().toLocaleString('es-AR')}</p>
                </div>

                <div style="padding: 24px; background: white;">

                    <!-- Total destacado -->
                    <div style="background: #fef9c3; border: 2px solid #fbbf24; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 22px; font-weight: 700; color: #92400e;">💰 Total: ${this.formatPrice(orderData.total)}</p>
                        <p style="margin: 4px 0 0; color: #92400e;">Método de pago: <strong>${orderData.paymentMethod === 'mercadopago' ? '✅ Mercado Pago' : orderData.paymentMethod === 'transfer' ? '🏦 Transferencia (verificar)' : '💵 Efectivo en local'}</strong></p>
                    </div>

                    <!-- Datos del cliente -->
                    <h3 style="color: #1a1a2e; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">👤 Datos del cliente</h3>
                    <p style="margin: 6px 0;"><strong>Nombre:</strong> ${customerData.name}</p>
                    <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${customerData.email}" style="color: #667eea;">${customerData.email}</a></p>
                    <p style="margin: 6px 0;"><strong>Teléfono:</strong> <a href="tel:${customerData.phone}" style="color: #667eea;">${customerData.phone}</a></p>
                    ${customerData.notes ? `<p style="margin: 6px 0;"><strong>Notas:</strong> ${customerData.notes}</p>` : ''}

                    <!-- Entrega -->
                    <h3 style="color: #1a1a2e; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-top: 20px;">📦 Entrega</h3>
                    <p style="margin: 6px 0;"><strong>Método:</strong> ${orderData.deliveryMethod}</p>
                    ${orderData.shippingAddress ? `<p style="margin: 6px 0;"><strong>Dirección:</strong> ${orderData.shippingAddress}</p>` : ''}

                    <!-- Productos -->
                    <h3 style="color: #1a1a2e; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-top: 20px;">🛍️ Productos</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 8px; text-align: left;">Producto</th>
                                <th style="padding: 8px; text-align: center;">Cant.</th>
                                <th style="padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${orderItemsHTML}</tbody>
                    </table>

                    ${orderData.paymentMethod === 'transfer' ? `
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #92400e;">⚠️ <strong>ATENCIÓN:</strong> Este pedido es por transferencia. Verificar comprobante antes de procesar.</p>
                    </div>
                    ` : ''}
                </div>

                <div style="background: #f3f4f6; padding: 12px; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">Bliss — Panel de administración</p>
                </div>
            </div>
        `;

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    "service_9cm0mf4",
                    "template_7gsgw9h",
                    {
                        to_email: "blissrcia@gmail.com",
                        subject: `🛒 Nuevo pedido: ${orderData.orderNumber} — ${this.formatPrice(orderData.total)}`,
                        message: adminHTML
                    }
                );
                console.log('✅ Notificación enviada al admin');
            }
            return true;
        } catch (error) {
            console.error('❌ Error enviando notificación al admin:', error);
            return false;
        }
    }
}

// Instancia global
const emailService = new EmailService();