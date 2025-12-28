-- PostgreSQL Schema for UltimateApp

-- Users table to store login information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for wallet activities
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL, -- e.g., 'add', 'send', 'food_purchase', 'ride_fare'
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Food orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    restaurant_name VARCHAR(100) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'confirmed', 'delivered'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Rides table for taxi services
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- e.g., 'requested', 'driver_assigned', 'in_progress', 'completed', 'cancelled'
    fare DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);






-- Mesajlar tablosu
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Index'ler
CREATE INDEX idx_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_created_at ON messages(created_at DESC);