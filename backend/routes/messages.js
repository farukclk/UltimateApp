const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../db'); // Mevcut database connection'ınız


const JWT_SECRET = 'your_super_secret_key_that_is_long_and_secure';

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



// Tüm kullanıcıları getir
router.get('/users', verifyToken, async (req, res) => {
  try {
    console.log('👤 req.user:', req.user); // ← Tüm user objesini göster
    console.log('🆔 req.user.userId:', req.user.userId);
    
    const result = await pool.query(
      'SELECT id, username FROM users where id != $1',
      [req.user.userId]
    );
    
    console.log('✅ All users:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Hata' });
  }
});




// Belirli bir kullanıcıyla mesajları getir
router.get('/messages/:userId', verifyToken, async (req, res) => {
  const otherUserId = req.params.userId;
  const myId = req.user.userId;

  const result = await pool.query(
    `SELECT sender_id as from, receiver_id as to, content as text, created_at FROM messages
     WHERE (sender_id = $1 AND receiver_id = $2)
        OR (sender_id = $2 AND receiver_id = $1)
     ORDER BY created_at ASC`,
    [myId, otherUserId]
  );

  res.json(result.rows);
});



module.exports = router;