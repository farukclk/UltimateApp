const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL bağlantı havuzu oluştur
const pool = new Pool({
    user: process.env.DB_USER || 'username',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'your_database_name',
    password: process.env.DB_PASSWORD || 'your_database_password',  
    port: process.env.DB_PORT || 5432,
    max: 20, // Maksimum bağlantı sayısı
    idleTimeoutMillis: 30000, // Boşta bekletme süresi
    connectionTimeoutMillis: 2000, // Bağlantı timeout süresi
});

// Bağlantı test fonksiyonu
pool.on('connect', () => {
    console.log('✓ PostgreSQL database connected successfully');
});

pool.on('error', (err) => {
    console.error('✗ Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

// Query fonksiyonu - Promise döndürür
const query = (text, params) => {
    return pool.query(text, params);
};

// Transaction başlatma fonksiyonu (opsiyonel)
const getClient = () => {
    return pool.connect();
};

module.exports = {
    query,
    getClient,
    pool
};