# UltimateApp 🚀

**UltimateApp**, finans, yemek siparişi ve ulaşım çözümlerini tek bir çatı altında toplayan modern bir "Super App" projesidir. React Native (Expo) ve Node.js teknolojileri kullanılarak geliştirilmiştir.

## 📱 Özellikler

### 💰 Cüzdan & Finans
*   **Bakiye Görüntüleme:** Anlık bakiye takibi.
*   **Para Yükleme:** Simüle edilmiş bakiye yükleme.
*   **Para Transferi (YENİ!):** IBAN üzerinden güvenli para transferi (Otomatik "TR" formatlı).
*   **İşlem Geçmişi:** Tüm harcama ve yüklemelerin detaylı listesi.

### 🍽️ Yemek Siparişi
*   **Kategoriler:** Et, Tavuk, Tatlı ve İçecek kategorileri.
*   **Akıllı Arama (YENİ!):** Yemekleri isme göre anında filtreleme.
*   **Sepet Yönetimi:** Ürün ekleme/çıkarma ve sipariş verme.

### 🚗 Ulaşım (Ride)
*   **Yolculuk:** Konum bazlı araç çağırma arayüzü (Simülasyon).
*   **Geçmiş:** Yapılan yolculukların kaydı.

### 👤 Profil
*   Kullanıcı bilgileri güncelleme.
*   Adres yönetimi.

## 🛠️ Teknolojiler

### Backend
*   **Node.js & Express.js:** RESTful API mimarisi.
*   **PostgreSQL:** Veritabanı yönetimi.
*   **JWT (JSON Web Token):** Güvenli kimlik doğrulama.

### Mobile
*   **React Native & Expo:** Cross-platform mobil geliştirme.
*   **Glassmorphism UI:** Modern ve şeffaf tasarım dili.
*   **React Navigation:** Sayfalar arası geçiş yönetimi.

## 🚀 Kurulum (Local Setup)

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Ön Hazırlık
1.  **Node.js** yüklü olmalı.
2.  **PostgreSQL** yüklü ve çalışıyor olmalı.
3.  **Expo Go** uygulaması telefonunuzda yüklü olmalı (veya Emülatör).

### 1. Veritabanı Kurulumu
1.  PostgreSQL'de `ultimate_app` adında bir veritabanı oluşturun.
2.  `backend/db_schema.sql` dosyasını çalıştırarak tabloları oluşturun.
3.  `backend/db.js` dosyasındaki veritabanı şifresini kendi şifrenizle güncelleyin.

### 2. Backend'i Başlatma
```bash
cd backend
npm install
npm start
```
*Backend varsayılan olarak `http://localhost:3000` portunda çalışacaktır.*

### 3. Mobil Uygulamayı Başlatma
Yeni bir terminal açın ve:
```bash
cd mobile
npm install
```

**Önemli:** `mobile/App.js` dosyasındaki `API_URL` satırını kendi yerel IP adresinizle güncelleyin:
```javascript
// Örnek:
const API_URL = 'http://192.168.1.XX:3000'; 
```

Uygulamayı başlatın:
```bash
npx expo start
```
QR kodunu telefonunuzdaki **Expo Go** uygulaması ile okutun.

## 🤝 Katkıda Bulunanlar

4 kişilik harika bir ekip çalışması ile geliştirildi:
*   **Backend Developer:** API ve Veritabanı Mimarisi.
*   **Mobile UI Developer:** Cüzdan ve Transfer Ekranları.
*   **Frontend Feature Developer:** Yemek Arama ve Filtreleme.
*   **QA & Refinement Specialist:** Validasyonlar ve UI İyileştirmeleri.
