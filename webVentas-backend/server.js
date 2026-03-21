const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN ====================

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ==================== MERCADO PAGO ====================

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// ==================== RUTAS ====================

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor Bliss funcionando!' });
});

// Crear preferencia de pago
app.post('/crear-preferencia', async (req, res) => {

    try {
        const { items, customerData, orderData } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No hay productos en el carrito' });
        }

        // Armar los items en formato que pide MP
        const mpItems = items.map(item => ({
            id: item.id || String(Math.random()),
            title: item.name,
            quantity: Number(item.quantity),
            unit_price: Number(item.price),
            currency_id: 'ARS'
        }));

        const preference = new Preference(mpClient);

        const result = await preference.create({
            body: {
                items: mpItems,
                payer: {
                    name: customerData.name,
                    email: customerData.email,
                    phone: {
                        number: customerData.phone
                    }
                },
                external_reference: orderData.orderNumber,
statement_descriptor: 'BLISS TIENDA'
            }
        });

        console.log('Preferencia creada:', result.id);

        res.json({
            id: result.id,
            init_point: result.init_point,        // URL real (producción)
            sandbox_init_point: result.sandbox_init_point // URL de pruebas
        });

    } catch (error) {
        console.error('Error creando preferencia MP:', error);
        res.status(500).json({ error: 'Error al crear la preferencia de pago' });
    }
});

// Webhook - MP nos avisa cuando alguien paga
app.post('/webhook', async (req, res) => {

    try {
        const { type, data } = req.body;

        console.log('Webhook recibido:', type, data);

        if (type === 'payment') {

            const payment = new Payment(mpClient);
            const paymentInfo = await payment.get({ id: data.id });

            console.log('Estado del pago:', paymentInfo.status);
            console.log('Orden:', paymentInfo.external_reference);

            // Acá podés actualizar Firebase con el estado del pago
            // Por ahora solo lo logueamos
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📦 Ambiente: ${process.env.MP_ACCESS_TOKEN?.startsWith('TEST') ? 'PRUEBAS' : 'PRODUCCIÓN'}`);
    console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL}\n`);
});