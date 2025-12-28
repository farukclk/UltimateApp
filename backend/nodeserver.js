const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const http = require('http');
const bcrypt = require('bcrypt');
const WebSocket = require('ws');
const db = require('./db'); // Veritabanı bağlantı modülümüz
const { create } = require('domain');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const JWT_SECRET = 'your_super_secret_key_that_is_long_and_secure';
const SALT_ROUNDS = 10; // bcrypt için salt round sayısı

// Middleware'ler
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ==> ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.body).length > 0) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// --- Auth Endpoints ---

// Kullanıcı Kayıt
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // Şifreyi hash'le
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Yeni kullanıcıyı veritabanına ekle
        const text = 'INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id, username';
        const values = [username, passwordHash];

        const dbRes = await db.query(text, values);
        const newUser = dbRes.rows[0];

        res.status(201).json({ message: 'User registered successfully!', user: { id: newUser.id, username: newUser.username } });

    } catch (err) {
        // '23505' PostgreSQL'de unique violation hatasıdır (kullanıcı adı zaten var)
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Username already in use.' });
        }
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

// Kullanıcı Giriş
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // Kullanıcıyı veritabanında bul
        const text = 'SELECT * FROM users WHERE username = $1';
        const values = [username];
        const dbRes = await db.query(text, values);

        if (dbRes.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = dbRes.rows[0];

        // Gelen şifre ile veritabanındaki hash'i karşılaştır
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (passwordMatch) {
            // Şifre doğru, token oluştur
            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Login successful!', token: token , id: user.id});
        } else {
            // Şifre yanlış
            res.status(401).json({ message: 'Invalid credentials.' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});


// --- Dummy Endpoints (Token doğrulama güncellendi) ---

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user; // user payload'u { userId, username } içeriyor
        next();
    });
};


// =============================================
// CÜZDAN (WALLET) ENDPOINTS
// =============================================

// Cüzdan Bakiyesi (korumalı)
app.get('/wallet/balance', verifyToken, async (req, res) => {
    try {
        // Kullanıcının toplam bakiyesini hesapla (transactions tablosundan)
        const result = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        res.json({
            user: req.user.username,
            balance: parseFloat(result.rows[0].balance).toFixed(2),
            last_updated: new Date().toLocaleDateString('tr-TR')
        });
    } catch (err) {
        console.error('Error fetching balance:', err);
        res.status(500).json({ message: 'Bakiye alınamadı.' });
    }
});

// Para Yükleme
app.post('/wallet/add', verifyToken, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Geçerli bir miktar girin.' });
    }

    try {
        await db.query(
            `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'add', $2, 'Para yükleme')`,
            [req.user.userId, amount]
        );

        // Yeni bakiyeyi hesapla
        const result = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        res.json({
            message: 'Para başarıyla yüklendi!',
            newBalance: parseFloat(result.rows[0].balance).toFixed(2)
        });
    } catch (err) {
        console.error('Error adding money:', err);
        res.status(500).json({ message: 'Para yüklenemedi.' });
    }
});

// Para Transferi
app.post('/wallet/transfer', verifyToken, async (req, res) => {
    const { amount, iban, recipientName } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Geçerli bir miktar girin.' });
    }

    if (!iban || !recipientName) {
        return res.status(400).json({ message: 'Alıcı bilgileri eksik.' });
    }

    try {
        // Bakiye kontrolü
        const balanceResult = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        const balance = parseFloat(balanceResult.rows[0].balance);

        if (balance < amount) {
            return res.status(400).json({ message: 'Yetersiz bakiye!' });
        }

        // Transfer işlemini kaydet
        await db.query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, 'transfer', $2, $3)`,
            [req.user.userId, amount, `Transfer: ${recipientName} (${iban})`]
        );

        // Yeni bakiyeyi hesapla
        const newBalance = (balance - parseFloat(amount)).toFixed(2);

        res.json({
            message: 'Transfer başarıyla gerçekleşti!',
            newBalance: newBalance
        });
    } catch (err) {
        console.error('Error transferring money:', err);
        res.status(500).json({ message: 'Transfer işlemi başarısız.' });
    }
});

// İşlem Geçmişi
app.get('/wallet/transactions', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, type, amount, description, created_at 
             FROM transactions WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 20`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ message: 'İşlem geçmişi alınamadı.' });
    }
});

// =============================================
// YEMEK (FOOD) ENDPOINTS
// =============================================

// Yemek Listesi
app.get('/food/list', (req, res) => {
    res.json([
        { id: 1, name: 'Adana Kebap', price: 180, image: '🍖', description: 'Acılı, lezzetli Adana usulü' },
        { id: 2, name: 'İskender', price: 200, image: '🥙', description: 'Tereyağlı, yoğurtlu' },
        { id: 3, name: 'Döner', price: 120, image: '🌯', description: 'Tavuk veya et seçenekli' },
        { id: 4, name: 'Lahmacun', price: 45, image: '🫓', description: 'İnce hamur, bol malzeme' },
        { id: 5, name: 'Pide', price: 90, image: '🥖', description: 'Kaşarlı veya kıymalı' },
        { id: 6, name: 'Baklava', price: 80, image: '🍯', description: 'Antep fıstıklı, şerbetli' },
    ]);
});

// Yemek Siparişi Ver
app.post('/food/order', verifyToken, async (req, res) => {
    const { items, totalPrice, restaurantName } = req.body;

    if (!items || !totalPrice) {
        return res.status(400).json({ message: 'Sipariş bilgileri eksik.' });
    }

    try {
        // Bakiye kontrolü
        const balanceResult = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        const balance = parseFloat(balanceResult.rows[0].balance);

        if (balance < totalPrice) {
            return res.status(400).json({ message: 'Yetersiz bakiye!' });
        }

        // Siparişi kaydet
        const orderResult = await db.query(
            `INSERT INTO orders (user_id, restaurant_name, total_price, status) 
             VALUES ($1, $2, $3, 'confirmed') RETURNING id`,
            [req.user.userId, restaurantName || 'UltimateApp Restaurant', totalPrice]
        );

        // Bakiyeden düş
        await db.query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, 'food_purchase', $2, $3)`,
            [req.user.userId, totalPrice, `Yemek siparişi #${orderResult.rows[0].id}`]
        );

        res.json({
            message: 'Sipariş başarıyla oluşturuldu!',
            orderId: orderResult.rows[0].id,
            newBalance: (balance - totalPrice).toFixed(2)
        });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ message: 'Sipariş oluşturulamadı.' });
    }
});

// Sipariş Geçmişi
app.get('/food/orders', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, restaurant_name, total_price, status, created_at 
             FROM orders WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 10`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Sipariş geçmişi alınamadı.' });
    }
});

// =============================================
// RIDE (TAKSİ) ENDPOINTS
// =============================================

// Yolculuk Başlat
app.post('/ride/request', verifyToken, async (req, res) => {
    const { pickup, destination, estimatedFare } = req.body;

    if (!pickup || !destination) {
        return res.status(400).json({ message: 'Konum bilgileri eksik.' });
    }

    try {
        // Bakiye kontrolü
        const balanceResult = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        const balance = parseFloat(balanceResult.rows[0].balance);
        const fare = estimatedFare || 50; // Varsayılan ücret

        if (balance < fare) {
            return res.status(400).json({ message: 'Yetersiz bakiye!' });
        }

        // Yolculuk kaydı oluştur
        const rideResult = await db.query(
            `INSERT INTO rides (user_id, status, fare) 
             VALUES ($1, 'driver_assigned', $2) RETURNING id`,
            [req.user.userId, fare]
        );

        // Simüle edilmiş sürücü bilgisi
        const drivers = [
            { name: 'Ahmet Yılmaz', car: 'Toyota Corolla', plate: '34 ABC 123', rating: 4.8 },
            { name: 'Mehmet Demir', car: 'Honda Civic', plate: '34 XYZ 456', rating: 4.9 },
            { name: 'Ali Kaya', car: 'Renault Megane', plate: '34 DEF 789', rating: 4.7 },
        ];
        const driver = drivers[Math.floor(Math.random() * drivers.length)];

        res.json({
            message: 'Sürücü atandı!',
            rideId: rideResult.rows[0].id,
            driver: driver,
            estimatedArrival: '3-5 dakika',
            fare: fare
        });
    } catch (err) {
        console.error('Error requesting ride:', err);
        res.status(500).json({ message: 'Yolculuk oluşturulamadı.' });
    }
});

// Yolculuk Tamamla
app.post('/ride/complete', verifyToken, async (req, res) => {
    const { rideId } = req.body;

    try {
        // Yolculuk bilgisini al
        const rideResult = await db.query(
            `SELECT * FROM rides WHERE id = $1 AND user_id = $2`,
            [rideId, req.user.userId]
        );

        if (rideResult.rows.length === 0) {
            return res.status(404).json({ message: 'Yolculuk bulunamadı.' });
        }

        const ride = rideResult.rows[0];

        // Yolculuğu tamamla
        await db.query(
            `UPDATE rides SET status = 'completed' WHERE id = $1`,
            [rideId]
        );

        // Bakiyeden düş
        await db.query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, 'ride_fare', $2, $3)`,
            [req.user.userId, ride.fare, `Yolculuk #${rideId}`]
        );

        // Yeni bakiyeyi hesapla
        const balanceResult = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        res.json({
            message: 'Yolculuk tamamlandı!',
            fare: ride.fare,
            newBalance: parseFloat(balanceResult.rows[0].balance).toFixed(2)
        });
    } catch (err) {
        console.error('Error completing ride:', err);
        res.status(500).json({ message: 'Yolculuk tamamlanamadı.' });
    }
});

// Yolculuk Geçmişi
app.get('/ride/history', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, status, fare, created_at 
             FROM rides WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 10`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching ride history:', err);
        res.status(500).json({ message: 'Yolculuk geçmişi alınamadı.' });
    }
});

// =============================================
// PROFİL ENDPOINTS
// =============================================

// Profil Bilgilerini Getir
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const userResult = await db.query(
            `SELECT id, username, email, phone, full_name, created_at FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // İstatistikleri hesapla
        const ordersResult = await db.query(
            `SELECT COUNT(*) as total_orders FROM orders WHERE user_id = $1`,
            [req.user.userId]
        );

        const ridesResult = await db.query(
            `SELECT COUNT(*) as total_rides FROM rides WHERE user_id = $1 AND status = 'completed'`,
            [req.user.userId]
        );

        const balanceResult = await db.query(
            `SELECT COALESCE(SUM(
                CASE WHEN type IN ('add', 'refund') THEN amount 
                     ELSE -amount END
            ), 0) as balance FROM transactions WHERE user_id = $1`,
            [req.user.userId]
        );

        const user = userResult.rows[0];

        res.json({
            id: user.id,
            username: user.username,
            email: user.email || '',
            phone: user.phone || '',
            fullName: user.full_name || '',
            createdAt: user.created_at,
            stats: {
                totalOrders: parseInt(ordersResult.rows[0].total_orders),
                totalRides: parseInt(ridesResult.rows[0].total_rides),
                balance: parseFloat(balanceResult.rows[0].balance).toFixed(2)
            }
        });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Profil bilgileri alınamadı.' });
    }
});

// Profil Güncelle
app.put('/profile', verifyToken, async (req, res) => {
    const { email, phone, fullName } = req.body;

    try {
        await db.query(
            `UPDATE users SET email = $1, phone = $2, full_name = $3 WHERE id = $4`,
            [email || null, phone || null, fullName || null, req.user.userId]
        );

        res.json({ message: 'Profil başarıyla güncellendi!' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Profil güncellenemedi.' });
    }
});

// Şifre Değiştir
app.put('/profile/password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Mevcut ve yeni şifre gerekli.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalı.' });
    }

    try {
        // Mevcut şifreyi kontrol et
        const userResult = await db.query(
            `SELECT password_hash FROM users WHERE id = $1`,
            [req.user.userId]
        );

        const passwordMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Mevcut şifre yanlış.' });
        }

        // Yeni şifreyi hash'le ve güncelle
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await db.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [newPasswordHash, req.user.userId]
        );

        res.json({ message: 'Şifre başarıyla değiştirildi!' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Şifre değiştirilemedi.' });
    }
});

// =============================================
// ADRES ENDPOINTS
// =============================================

// Adresleri Listele
app.get('/addresses', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, address, is_default, created_at 
             FROM addresses WHERE user_id = $1 
             ORDER BY is_default DESC, created_at DESC`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching addresses:', err);
        res.status(500).json({ message: 'Adresler alınamadı.' });
    }
});

// Yeni Adres Ekle
app.post('/addresses', verifyToken, async (req, res) => {
    const { title, address, isDefault } = req.body;

    if (!title || !address) {
        return res.status(400).json({ message: 'Başlık ve adres gerekli.' });
    }

    try {
        // Eğer varsayılan olarak işaretlendiyse, diğerlerini kaldır
        if (isDefault) {
            await db.query(
                `UPDATE addresses SET is_default = false WHERE user_id = $1`,
                [req.user.userId]
            );
        }

        const result = await db.query(
            `INSERT INTO addresses (user_id, title, address, is_default) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [req.user.userId, title, address, isDefault || false]
        );

        res.status(201).json({
            message: 'Adres başarıyla eklendi!',
            addressId: result.rows[0].id
        });
    } catch (err) {
        console.error('Error adding address:', err);
        res.status(500).json({ message: 'Adres eklenemedi.' });
    }
});

// Adres Güncelle
app.put('/addresses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, address, isDefault } = req.body;

    try {
        // Adresin bu kullanıcıya ait olduğunu kontrol et
        const checkResult = await db.query(
            `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
            [id, req.user.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Adres bulunamadı.' });
        }

        // Eğer varsayılan olarak işaretlendiyse, diğerlerini kaldır
        if (isDefault) {
            await db.query(
                `UPDATE addresses SET is_default = false WHERE user_id = $1`,
                [req.user.userId]
            );
        }

        await db.query(
            `UPDATE addresses SET title = $1, address = $2, is_default = $3 WHERE id = $4`,
            [title, address, isDefault || false, id]
        );

        res.json({ message: 'Adres başarıyla güncellendi!' });
    } catch (err) {
        console.error('Error updating address:', err);
        res.status(500).json({ message: 'Adres güncellenemedi.' });
    }
});

// Adres Sil
app.delete('/addresses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Adres bulunamadı.' });
        }

        res.json({ message: 'Adres başarıyla silindi!' });
    } catch (err) {
        console.error('Error deleting address:', err);
        res.status(500).json({ message: 'Adres silinemedi.' });
    }
});


// Ana sayfa
app.get('/', (req, res) => {
    res.send('<h1>Backend Sunucusu (PostgreSQL Entegreli) Calisiyor!</h1>');
});




app.use('/api', require('./routes/messages')); 


// 3️⃣ HTTP server oluştur
const server = http.createServer(app);

// 4️⃣ WebSocket server
const wss = new WebSocket.Server({ server });

const targetWs = [];


wss.on('connection', (ws, req) => {
    console.log("new connn");
    const token = new URL(req.url, `http://${HOST}`).searchParams.get('token');
    console.log('✅ Yeni client bağlandı: ');

    
    let myId;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        myId = decoded.userId; // token içinde userId varsa
        targetWs[myId] = ws;
    }
    catch (e) {}
       
    

    ws.on('message', async (msg) => {
        console.log( JSON.parse(msg));
        try {
            const data = JSON.parse(msg);
            const token = data.token;
            const to = data.to; 

            if (token == null) return;
            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (err) return; // Forbidden
            });


            
            const decoded = jwt.verify(token, JWT_SECRET);
            const senderId = decoded.userId; // token içinde userId varsa
            console.log('Mesaj gönderen userId:', senderId);
            
 
        

            // hedefe bildirim yolla
            const targetSocket = targetWs[to];
            if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
                targetSocket.send(JSON.stringify({
                    from: senderId,
                    text: data.text,
                    //created_at: new Date().toISOString().replace('T', ' ').replace('Z', '') 
                    created_ad: data.created_at
                }));
                console.log(`Mesaj ${to} kullanıcısına gönderildi.`);
            } 
            else {
                console.log(`❌ Hedef kullanıcı (${to}) bağlı değil.`);
            }

            // db ye kaydet
            const sql = 'INSERT INTO MESSAGES(SENDER_ID, RECEIVER_ID, CONTENT) VALUES($1, $2, $3)'
            const values = [senderId, to, data.text];
            const dbRes = await db.query(sql, values);
            console.log("db ye kaydedildi mesaj");
        

        } catch (e) {
            console.log("error");
        console.error(e);
        }
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected:', myId);
        delete targetWs[myId];
    });
});



server.listen(PORT, () => {
    console.log(`🚀 Server ${PORT} portunda hazır.`);
});

