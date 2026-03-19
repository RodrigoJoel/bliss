// ==================== SERVICIO DE EMAILS ====================
class EmailService {
    constructor() {
        // Configurar EmailJS (si lo usas)
        if (typeof emailjs !== 'undefined') {
            emailjs.init("TU_PUBLIC_KEY");
        }
    }

    // Enviar email de confirmación al cliente
    async sendOrderConfirmation(orderData, customerData) {
        const orderItemsHTML = orderData.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const emailTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #4a8ef5; color: white; padding: 20px; text-align: center;">
                    <h1>¡Gracias por tu compra en Bliss!</h1>
                </div>
                
                <div style="padding: 20px;">
                    <h2>Detalles de tu pedido:</h2>
                    <p><strong>N° de orden:</strong> ${orderData.orderNumber}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
                    
                    <h3>Productos:</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 10px; text-align: left;">Producto</th>
                                <th style="padding: 10px; text-align: center;">Cantidad</th>
                                <th style="padding: 10px; text-align: right;">Precio</th>
                                <th style="padding: 10px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderItemsHTML}
                        </tbody>
                    </table>
                    
                    <div style="text-align: right; margin-top: 20px;">
                        <p><strong>Subtotal:</strong> $${orderData.subtotal.toFixed(2)}</p>
                        <p><strong>Envío:</strong> $${orderData.shippingCost.toFixed(2)}</p>
                        <h3>Total: $${orderData.total.toFixed(2)}</h3>
                    </div>
                    
                    <h3>Información del pedido:</h3>
                    <p><strong>Método de entrega:</strong> ${orderData.deliveryMethod}</p>
                    <p><strong>Método de pago:</strong> ${orderData.paymentMethod}</p>
                    
                    <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <h4>Información de contacto:</h4>
                        <p><strong>Nombre:</strong> ${customerData.name}</p>
                        <p><strong>Email:</strong> ${customerData.email}</p>
                        <p><strong>Teléfono:</strong> ${customerData.phone}</p>
                        ${orderData.shippingAddress ? `
                            <p><strong>Dirección:</strong> ${orderData.shippingAddress}</p>
                        ` : ''}
                    </div>
                    
                    <p style="margin-top: 30px;">
                        <strong>¿Tienes preguntas?</strong><br>
                        Contáctanos en blissrcia@gmail.com o al teléfono: +54 9 11 1234-5678
                    </p>
                </div>
                
                <div style="background: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>© 2024 Bliss. Todos los derechos reservados.</p>
                </div>
            </div>
        `;

        // Enviar email usando EmailJS o fetch
        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    "service_9cm0mf4",
                    "template_d06mlj9",
                    {
                        to_email: customerData.email,
                        to_name: customerData.name,
                        order_details: emailTemplate,
                        order_number: orderData.orderNumber,
                        total_amount: `$${orderData.total.toFixed(2)}`
                    }
                );
            } else {
                // Fallback: usar API simple
                await this.sendEmailViaAPI(customerData.email, "Confirmación de pedido - Bliss", emailTemplate);
            }
            
            console.log('✅ Email enviado al cliente');
            return true;
        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return false;
        }
    }

    // Enviar notificación al admin
    async sendAdminNotification(orderData, customerData) {
        const adminEmail = 'blissrcia@gmail.com';
        
        const adminTemplate = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #dc2626;">🛒 NUEVO PEDIDO RECIBIDO</h2>
                
                <h3>📋 Resumen del pedido:</h3>
                <p><strong>N° de orden:</strong> ${orderData.orderNumber}</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
                <p><strong>Total:</strong> $${orderData.total.toFixed(2)}</p>
                
                <h3>👤 Información del cliente:</h3>
                <ul>
                    <li><strong>Nombre:</strong> ${customerData.name}</li>
                    <li><strong>Email:</strong> ${customerData.email}</li>
                    <li><strong>Teléfono:</strong> ${customerData.phone}</li>
                    <li><strong>Notas:</strong> ${customerData.notes || 'Sin notas'}</li>
                </ul>
                
                <h3>📦 Detalles de entrega:</h3>
                <p><strong>Método:</strong> ${orderData.deliveryMethod}</p>
                ${orderData.shippingAddress ? `
                    <p><strong>Dirección:</strong> ${orderData.shippingAddress}</p>
                ` : ''}
                
                <h3>💳 Información de pago:</h3>
                <p><strong>Método:</strong> ${orderData.paymentMethod}</p>
                ${orderData.paymentMethod === 'transfer' ? `
                    <p style="background: #fef3c7; padding: 10px; border-radius: 5px;">
                        ⚠️ <strong>ATENCIÓN:</strong> Este pedido requiere confirmación de transferencia.
                    </p>
                ` : ''}
                
                <div style="margin-top: 30px; padding: 15px; background: #f0f4ff; border-radius: 8px;">
                    <h4>🔗 Acciones rápidas:</h4>
                    <p>• Ver pedido completo en Firebase Console</p>
                    <p>• Contactar al cliente: ${customerData.phone}</p>
                    <p>• Marcar como procesado cuando esté listo</p>
                </div>
            </div>
        `;

        try {
            // Enviar al admin
            await this.sendEmailViaAPI(adminEmail, `Nuevo pedido: ${orderData.orderNumber}`, adminTemplate);
            console.log('✅ Notificación enviada al admin');
            return true;
        } catch (error) {
            console.error('❌ Error enviando notificación al admin:', error);
            return false;
        }
    }

    // Método genérico para enviar emails (usando un servicio simple)
    async sendEmailViaAPI(to, subject, htmlContent) {
        // Aquí puedes integrar con SendGrid, SMTP, o cualquier servicio
        // Por ahora, solo log para desarrollo
        console.log(`📧 Email simulado a: ${to}`);
        console.log(`📝 Asunto: ${subject}`);
        
        // En desarrollo, guardar en localStorage para ver
        const emails = JSON.parse(localStorage.getItem('bliss_emails') || '[]');
        emails.push({
            to,
            subject,
            html: htmlContent,
            sentAt: new Date().toISOString()
        });
        localStorage.setItem('bliss_emails', JSON.stringify(emails));
        
        return true;
    }
}

// Instancia global del servicio de emails
const emailService = new EmailService();