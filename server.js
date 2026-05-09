require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const path = require('path');

const app = express();

// ============= MIDDLEWARE =============
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root directory
app.use(express.static(path.join(__dirname), {
    extensions: ['html']
}));

// ============= MIDTRANS CONFIG =============
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
    console.error('❌ MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY harus di-set di file .env');
    console.error('   Buat file .env dengan isi:');
    console.error('   MIDTRANS_SERVER_KEY=Mid-server-xxxxx');
    console.error('   MIDTRANS_CLIENT_KEY=Mid-client-xxxxx');
    process.exit(1);
}

let snap = new midtransClient.Snap({
    isProduction: IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY
});

// ============= API: Get Client Key =============
app.get('/api/client-key', (req, res) => {
    res.json({ clientKey: MIDTRANS_CLIENT_KEY });
});

// ============= API: Create Transaction =============
app.post('/api/checkout', async (req, res) => {
    try {
        const { total, items, customer_details } = req.body;

        // Validasi input
        if (!total || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Data pesanan tidak lengkap',
                detail: 'Total dan daftar item wajib diisi.' 
            });
        }

        // Buat Order ID unik
        const orderId = 'HELIA-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        // Build item_details untuk Midtrans
        let midtransItems = items.map((item, index) => ({
            id: item.id || `ITEM-${index + 1}`,
            price: Math.round(Number(item.price)),
            quantity: Math.round(Number(item.qty || item.quantity || 1)),
            name: String(item.name || 'Produk HELIA').substring(0, 50)
        }));

        // Hitung subtotal dari items
        let itemsTotal = midtransItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Hitung ongkir sebagai selisih total - items
        let ongkir = Math.round(Number(total)) - itemsTotal;

        if (ongkir > 0) {
            midtransItems.push({
                id: 'SHIPPING',
                price: ongkir,
                quantity: 1,
                name: 'Ongkos Kirim'
            });
        }

        // Pastikan gross_amount = sum of (price * quantity) dari semua item
        let grossAmount = midtransItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Parameter transaksi Midtrans
        let parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: grossAmount
            },
            item_details: midtransItems,
            customer_details: {
                first_name: (customer_details && customer_details.name) || 'Customer',
                email: (customer_details && customer_details.email) || 'customer@helia.com',
                phone: (customer_details && customer_details.phone) || '08123456789'
            },
            credit_card: {
                secure: true
            }
        };

        console.log('📦 Creating Midtrans transaction:', JSON.stringify(parameter, null, 2));

        // Buat transaksi
        const transaction = await snap.createTransaction(parameter);
        
        console.log('✅ Transaction token created:', transaction.token);

        res.json({ 
            token: transaction.token,
            redirect_url: transaction.redirect_url,
            order_id: orderId
        });
        
    } catch (error) {
        console.error('❌ Midtrans Error:', error.message || error);
        
        // Berikan error message yang jelas
        let errorMessage = 'Gagal membuat transaksi pembayaran';
        let statusCode = 500;
        
        if (error.httpStatusCode) {
            statusCode = error.httpStatusCode;
        }
        
        if (error.ApiResponse) {
            errorMessage = JSON.stringify(error.ApiResponse);
            console.error('API Response:', error.ApiResponse);
        }

        res.status(statusCode).json({ 
            error: errorMessage,
            detail: error.message || 'Unknown server error'
        });
    }
});

// ============= API: Payment Notification (Webhook) =============
app.post('/api/notification', async (req, res) => {
    try {
        const notification = req.body;
        console.log('🔔 Payment Notification:', JSON.stringify(notification, null, 2));

        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;

        let status = '';
        if (transactionStatus === 'capture') {
            status = (fraudStatus === 'accept') ? 'success' : 'fraud';
        } else if (transactionStatus === 'settlement') {
            status = 'success';
        } else if (transactionStatus === 'pending') {
            status = 'pending';
        } else if (['deny', 'cancel', 'expire'].includes(transactionStatus)) {
            status = 'failed';
        }

        console.log(`📝 Order ${orderId}: ${status}`);
        
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('❌ Notification Error:', error);
        res.status(500).json({ error: 'Notification handling failed' });
    }
});

// ============= FALLBACK: Serve index.html =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║    🛍️  HELIA Indonesia — Server Active    ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  🌐 URL: http://localhost:${PORT}            ║`);
    console.log(`║  💳 Midtrans: ${IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX'}              ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});
