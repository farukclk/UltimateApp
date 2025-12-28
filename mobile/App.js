import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { registerRootComponent } from 'expo';
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Modal,
  RefreshControl,
  Dimensions,
  Button
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// --- Configuration & Constants ---
const API_URL = 'http://192.168.0.13:3000';
const WS_URL = 'ws://192.168.0.13:3000';
const socket = io(API_URL, {
  transports: ['websocket'],
  autoConnect: false,
});;

let MY_USER_ID;

// 🎨 Güzel & Sıcak Renk Paleti
const COLORS = {
  background: '#1a1a2e',
  backgroundLight: '#16213e',
  card: '#0f3460',
  surface: 'rgba(255, 255, 255, 0.08)',

  // Ana renkler
  primary: '#4361ee',
  secondary: '#7209b7',
  accent: '#f72585',

  // Pozitif/Negatif
  success: '#06d6a0',
  warning: '#ffd166',
  danger: '#ef476f',

  // Özel renkler
  orange: '#ff9f1c',
  teal: '#2ec4b6',
  purple: '#9b5de5',
  pink: '#f15bb5',

  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.15)',
};

// Navigation Theme
const DarkNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    text: COLORS.text,
    border: 'transparent',
  },
};

// --- Authentication Context ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({ token: null, isLoading: true });

  useEffect(() => {
    setAuthState({ token: null, isLoading: false });
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        setAuthState({ token: data.token, isLoading: false });
        MY_USER_ID = data.id;
        return { success: true };
      } else {
        Alert.alert('Giriş Başarısız', data.message || 'Hatalı Şifre!');
        return { success: false };
      }
    } catch (error) {
      Alert.alert('Sunucuya Ulaşılamadı!', 'Backend sunucusunun çalıştığından emin olun.');
      return { success: false };
    }
  };

  const logout = () => setAuthState({ token: null, isLoading: false });

  return <AuthContext.Provider value={{ ...authState, login, logout }}>{children}</AuthContext.Provider>;
};

// --- API Hook ---
const useApi = () => {
  const { token, logout } = useContext(AuthContext);
  return async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    if (response.status === 401) { logout(); return null; }
    return response.json();
  };
};

// ============================================
// REUSABLE COMPONENTS
// ============================================
const GlassCard = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>{children}</View>
);

const GradientButton = ({ onPress, title, loading, style, colors }) => (
  <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8}>
    <LinearGradient
      colors={colors || [COLORS.primary, COLORS.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradientButton, style]}
    >
      {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.gradientButtonText}>{title}</Text>}
    </LinearGradient>
  </TouchableOpacity>
);

// ============================================
// LOGIN SCREEN
// ============================================
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('testuser');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <View style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.logoCircle}>
            <Ionicons name="rocket" size={50} color={COLORS.text} />
          </LinearGradient>
          <Text style={styles.logoText}>UltimateApp</Text>
          <Text style={styles.logoSubtext}>Süper Uygulama</Text>
        </View>

        {/* Form */}
        <View style={styles.authForm}>
          <GlassCard style={styles.inputCard}>
            <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.authInput}
              placeholder="Kullanıcı Adı"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </GlassCard>

          <GlassCard style={styles.inputCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.authInput}
              placeholder="Şifre"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </GlassCard>

          <GradientButton onPress={handleLogin} title="Giriş Yap" loading={loading} style={styles.loginButton} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Hesabın yok mu? <Text style={{ fontWeight: 'bold', color: COLORS.accent }}>Kayıt Ol</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// REGISTER SCREEN
// ============================================
const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) { Alert.alert('Hata', 'Tüm alanları doldurun.'); return; }
    if (password !== confirmPassword) { Alert.alert('Hata', 'Şifreler eşleşmiyor.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Başarılı!', 'Hesap oluşturuldu.', [{ text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }]);
      } else {
        Alert.alert('Hata', data.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.authContainer}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContent}>
        <View style={styles.logoContainer}>
          <LinearGradient colors={[COLORS.secondary, COLORS.pink]} style={styles.logoCircle}>
            <Ionicons name="person-add" size={50} color={COLORS.text} />
          </LinearGradient>
          <Text style={styles.logoText}>Kayıt Ol</Text>
        </View>

        <View style={styles.authForm}>
          <GlassCard style={styles.inputCard}>
            <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.authInput} placeholder="Kullanıcı Adı" placeholderTextColor={COLORS.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
          </GlassCard>

          <GlassCard style={styles.inputCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.authInput} placeholder="Şifre" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
          </GlassCard>

          <GlassCard style={styles.inputCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.authInput} placeholder="Şifre Tekrar" placeholderTextColor={COLORS.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </GlassCard>

          <GradientButton onPress={handleRegister} title="Kayıt Ol" loading={loading} colors={[COLORS.secondary, COLORS.pink]} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.registerLink}>Zaten hesabın var mı? <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>Giriş Yap</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// WALLET SCREEN
// ============================================
const WalletScreen = () => {
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [iban, setIban] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const api = useApi();

  const fetchData = useCallback(async () => {
    const balanceData = await api('/wallet/balance');
    if (balanceData) setBalance(balanceData.balance);
    const transData = await api('/wallet/transactions');
    if (transData) setTransactions(transData);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Hata', 'Geçerli miktar girin.'); return; }
    setLoading(true);
    const result = await api('/wallet/add', { method: 'POST', body: JSON.stringify({ amount: parseFloat(amount) }) });
    if (result) {
      Alert.alert('Başarılı', result.message);
      setBalance(result.newBalance);
      setAmount('');
      setShowAddModal(false);
      fetchData();
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    // UI'dan sadece rakam geliyor, biz başına TR ekliyoruz.
    const cleanIban = 'TR' + iban.replace(/\D/g, '');

    if (!transferAmount || parseFloat(transferAmount) <= 0 || !iban || !recipientName) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (cleanIban.length !== 26) {
      Alert.alert('Hata', `IBAN eksik! (TR dahil 26 hane olmalı, şu an: ${cleanIban.length})`);
      return;
    }

    setLoading(true);
    const result = await api('/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(transferAmount),
        iban: cleanIban,
        recipientName
      })
    });

    if (result) {
      Alert.alert('Başarılı', result.message);
      setBalance(result.newBalance);
      setTransferAmount('');
      setIban('');
      setRecipientName('');
      setShowTransferModal(false);
      fetchData();
    }
    setLoading(false);
  };

  const getTransactionStyle = (type) => {
    switch (type) {
      case 'add': return { icon: 'arrow-down-circle', color: COLORS.success, prefix: '+' };
      case 'food_purchase': return { icon: 'restaurant', color: COLORS.orange, prefix: '-' };
      case 'ride_fare': return { icon: 'car', color: COLORS.primary, prefix: '-' };
      case 'transfer': return { icon: 'arrow-forward-circle', color: COLORS.danger, prefix: '-' };
      default: return { icon: 'swap-horizontal', color: COLORS.purple, prefix: '-' };
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Balance Card */}
        <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>💰 Bakiye</Text>
          <Text style={styles.balanceAmount}>₺{balance}</Text>
          <TouchableOpacity style={styles.addMoneyBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle" size={20} color={COLORS.text} />
            <Text style={styles.addMoneyText}>Para Yükle</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionItem} onPress={() => setShowTransferModal(true)}>
            <LinearGradient colors={[COLORS.purple, COLORS.pink]} style={styles.actionIcon}>
              <Ionicons name="send" size={22} color={COLORS.text} />
            </LinearGradient>
            <Text style={styles.actionLabel}>Para Transferi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Para İste', 'Para isteme özelliği yakında eklenecek.')}>
            <LinearGradient colors={[COLORS.success, COLORS.teal]} style={styles.actionIcon}>
              <Ionicons name="download" size={22} color={COLORS.text} />
            </LinearGradient>
            <Text style={styles.actionLabel}>Para İste</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Kart Yönetimi', 'Kart yönetimi özelliği yakında eklenecek.')}>
            <LinearGradient colors={[COLORS.orange, COLORS.warning]} style={styles.actionIcon}>
              <Ionicons name="card" size={22} color={COLORS.text} />
            </LinearGradient>
            <Text style={styles.actionLabel}>Kart Yönetimi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Finansal Analiz', 'Finansal analiz özelliği yakında eklenecek.')}>
            <LinearGradient colors={[COLORS.primary, COLORS.teal]} style={styles.actionIcon}>
              <Ionicons name="stats-chart" size={22} color={COLORS.text} />
            </LinearGradient>
            <Text style={styles.actionLabel}>Finansal Analiz</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>📋 Son İşlemler</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Henüz işlem yok</Text>
        ) : (
          transactions.map((item) => {
            const style = getTransactionStyle(item.type);
            return (
              <GlassCard key={item.id} style={styles.transactionCard}>
                <View style={[styles.transactionIcon, { backgroundColor: `${style.color}25` }]}>
                  <Ionicons name={style.icon} size={22} color={style.color} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{item.description}</Text>
                  <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: style.color }]}>{style.prefix}₺{parseFloat(item.amount).toFixed(2)}</Text>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Para Yükle</Text>
            <TextInput style={styles.modalInput} placeholder="Miktar (TL)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <View style={styles.quickAmounts}>
              {[50, 100, 200, 500].map(val => (
                <TouchableOpacity key={val} style={styles.quickAmountBtn} onPress={() => setAmount(val.toString())}>
                  <Text style={styles.quickAmountText}>{val}₺</Text>
                </TouchableOpacity>
              ))}
            </View>
            <GradientButton onPress={handleAddMoney} title="Yükle" loading={loading} />
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>


      {/* Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>💸 Para Transferi</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Alıcı Adı Soyadı"
              placeholderTextColor={COLORS.textMuted}
              value={recipientName}
              onChangeText={setRecipientName}
            />

            {/* Özel IBAN Input Alanı */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, borderRadius: 12, marginBottom: 12, paddingHorizontal: 14 }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginRight: 5 }}>TR</Text>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingLeft: 0, backgroundColor: 'transparent' }]}
                placeholder="IBAN (24 hane)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={24}
                value={iban}
                onChangeText={text => setIban(text.replace(/[^0-9]/g, ''))}
              />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Miktar (TL)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />

            <GradientButton
              onPress={handleTransfer}
              title="Gönder"
              loading={loading}
              colors={[COLORS.purple, COLORS.pink]}
            />

            <TouchableOpacity onPress={() => setShowTransferModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </View >
  );
};

// ============================================
// FOOD SCREEN - Kategorili
// ============================================
const FOOD_CATEGORIES = [
  { id: 'meat', name: '🥩 Et Yemekleri', color: COLORS.danger },
  { id: 'chicken', name: '🍗 Tavuk', color: COLORS.orange },
  { id: 'dessert', name: '🍰 Tatlılar', color: COLORS.pink },
  { id: 'drinks', name: '🥤 İçecekler', color: COLORS.teal },
];

const FOOD_ITEMS = [
  // Et Yemekleri
  { id: 1, name: 'Adana Kebap', price: 180, emoji: '🍢', color: COLORS.danger, desc: 'Acılı, lezzetli', category: 'meat' },
  { id: 2, name: 'İskender', price: 200, emoji: '🍖', color: COLORS.danger, desc: 'Tereyağlı', category: 'meat' },
  { id: 3, name: 'Döner', price: 120, emoji: '🥩', color: COLORS.danger, desc: 'Et döner', category: 'meat' },
  // Tavuk
  { id: 4, name: 'Tavuk Şiş', price: 140, emoji: '🍗', color: COLORS.orange, desc: 'Izgara tavuk', category: 'chicken' },
  { id: 5, name: 'Tavuk Döner', price: 100, emoji: '🍗', color: COLORS.orange, desc: 'Tavuk döner', category: 'chicken' },
  { id: 6, name: 'Chicken Wings', price: 90, emoji: '🍗', color: COLORS.orange, desc: 'Baharatlı kanat', category: 'chicken' },
  // Tatlılar
  { id: 7, name: 'Baklava', price: 80, emoji: '🥮', color: COLORS.pink, desc: 'Antep fıstıklı', category: 'dessert' },
  { id: 8, name: 'Künefe', price: 90, emoji: '🧇', color: COLORS.pink, desc: 'Peynirli', category: 'dessert' },
  { id: 9, name: 'Sütlaç', price: 50, emoji: '🍮', color: COLORS.pink, desc: 'Fırın sütlaç', category: 'dessert' },
  // İçecekler
  { id: 10, name: 'Ayran', price: 15, emoji: '🥛', color: COLORS.teal, desc: 'Taze ayran', category: 'drinks' },
  { id: 11, name: 'Kola', price: 25, emoji: '🥤', color: COLORS.teal, desc: 'Soğuk içecek', category: 'drinks' },
  { id: 12, name: 'Çay', price: 10, emoji: '🍵', color: COLORS.teal, desc: 'Demli çay', category: 'drinks' },
];

const FoodScreen = () => {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('meat');
  const [searchText, setSearchText] = useState('');
  const api = useApi();

  const addToCart = (food) => {
    const existing = cart.find(i => i.id === food.id);
    if (existing) {
      setCart(cart.map(i => i.id === food.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...food, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    const existing = cart.find(i => i.id === id);
    if (existing?.quantity > 1) {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i));
    } else {
      setCart(cart.filter(i => i.id !== id));
    }
  };

  const getTotal = () => cart.reduce((t, i) => t + (i.price * i.quantity), 0);
  const getQuantity = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const filteredFoods = searchText
    ? FOOD_ITEMS.filter(f => f.name.toLowerCase().includes(searchText.toLowerCase()))
    : FOOD_ITEMS.filter(f => f.category === selectedCategory);

  const handleOrder = async () => {
    if (cart.length === 0) { Alert.alert('Hata', 'Sepet boş!'); return; }
    const result = await api('/food/order', {
      method: 'POST',
      body: JSON.stringify({ items: cart, totalPrice: getTotal(), restaurantName: 'UltimateApp' })
    });
    if (result?.orderId) {
      Alert.alert('Başarılı! 🎉', `Sipariş #${result.orderId}\nYeni bakiye: ₺${result.newBalance}`);
      setCart([]);
    } else if (result?.message) {
      Alert.alert('Hata', result.message);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.screenTitle}>🍽️ Yemek Sipariş</Text>

      {/* Arama Çubuğu */}
      <GlassCard style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Yemek ara..."
          placeholderTextColor={COLORS.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </GlassCard>

      {/* Kategoriler (Arama varken gizleyebiliriz veya bırakabiliriz, bırakalım) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {FOOD_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryBtn, selectedCategory === cat.id && { backgroundColor: cat.color }]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.categoryBtnText, selectedCategory === cat.id && { color: COLORS.text }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Yemek Listesi */}
      <FlatList
        data={filteredFoods}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.foodGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const qty = getQuantity(item.id);
          return (
            <GlassCard style={styles.foodCard}>
              <Text style={styles.foodEmoji}>{item.emoji}</Text>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.foodDesc}>{item.desc}</Text>
              <Text style={[styles.foodPrice, { color: item.color }]}>₺{item.price}</Text>

              <View style={styles.foodActions}>
                {qty > 0 && (
                  <>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: COLORS.danger }]} onPress={() => removeFromCart(item.id)}>
                      <Ionicons name="remove" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{qty}</Text>
                  </>
                )}
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: COLORS.success }]} onPress={() => addToCart(item)}>
                  <Ionicons name="add" size={16} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        }}
      />

      {/* Sepet */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>🛒 {cart.reduce((t, i) => t + i.quantity, 0)} ürün</Text>
            <Text style={styles.cartTotal}>₺{getTotal()}</Text>
          </View>
          <GradientButton onPress={handleOrder} title="Sipariş Ver" style={styles.orderBtn} colors={[COLORS.success, COLORS.teal]} />
        </View>
      )}
    </View>
  );
};

// ============================================
// RIDE SCREEN - Kaydırılabilir
// ============================================
const RideScreen = () => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('economy');
  const api = useApi();

  const vehicles = [
    { id: 'economy', name: 'Ekonomik', icon: 'car-outline', price: '~₺35', color: COLORS.success },
    { id: 'comfort', name: 'Konfor', icon: 'car-sport-outline', price: '~₺50', color: COLORS.primary },
    { id: 'vip', name: 'VIP', icon: 'car', price: '~₺80', color: COLORS.purple },
  ];

  const quickLocations = ['Kadıköy', 'Taksim', 'Beşiktaş', 'Üsküdar', 'Ataşehir', 'Levent'];

  const handleRequest = async () => {
    if (!pickup || !destination) { Alert.alert('Hata', 'Konum bilgilerini girin.'); return; }
    setLoading(true);
    const fare = selectedVehicle === 'economy' ? 35 : selectedVehicle === 'comfort' ? 50 : 80;
    const result = await api('/ride/request', {
      method: 'POST',
      body: JSON.stringify({ pickup, destination, estimatedFare: fare + Math.floor(Math.random() * 20) })
    });
    setLoading(false);
    if (result?.rideId) {
      setActiveRide({ ...result, pickup, destination });
    } else if (result?.message) {
      Alert.alert('Hata', result.message);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const result = await api('/ride/complete', { method: 'POST', body: JSON.stringify({ rideId: activeRide.rideId }) });
    setLoading(false);
    if (result) {
      Alert.alert('Tamamlandı! 🎉', `Ücret: ₺${result.fare}\nBakiye: ₺${result.newBalance}`);
      setActiveRide(null);
      setPickup('');
      setDestination('');
    }
  };

  if (activeRide) {
    return (
      <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.screenTitle}>🚗 Aktif Yolculuk</Text>

        <GlassCard style={styles.driverCard}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.driverAvatar}>
            <Ionicons name="person" size={35} color={COLORS.text} />
          </LinearGradient>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{activeRide.driver.name}</Text>
            <Text style={styles.driverCar}>{activeRide.driver.car}</Text>
            <Text style={styles.driverPlate}>{activeRide.driver.plate}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.ratingText}>{activeRide.driver.rating}</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.routeText}>{activeRide.pickup}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.routeText}>{activeRide.destination}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>⏱️ {activeRide.estimatedArrival}</Text>
            <Text style={styles.fareAmount}>₺{activeRide.fare}</Text>
          </View>
        </GlassCard>

        <GradientButton onPress={handleComplete} title="✅ Yolculuğu Tamamla" loading={loading} colors={[COLORS.success, COLORS.teal]} style={{ marginTop: 20 }} />
        <TouchableOpacity onPress={() => setActiveRide(null)} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>❌ İptal Et</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 100 }}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.screenTitle}>🚕 Taksi Çağır</Text>

      {/* Harita Simülasyonu */}
      <LinearGradient colors={[COLORS.backgroundLight, COLORS.card]} style={styles.mapPlaceholder}>
        <View style={styles.mapPins}>
          <View style={[styles.mapPin, { top: 30, left: 50 }]}><Ionicons name="location" size={24} color={COLORS.primary} /></View>
          <View style={[styles.mapPin, { top: 80, right: 60 }]}><Ionicons name="location" size={20} color={COLORS.accent} /></View>
          <View style={[styles.mapPin, { bottom: 40, left: 80 }]}><Ionicons name="location" size={22} color={COLORS.purple} /></View>
        </View>
        <Text style={styles.mapText}>🗺️ Harita</Text>
      </LinearGradient>

      {/* Konum Girişleri */}
      <GlassCard style={styles.locationCard}>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.success }]} />
          <TextInput style={styles.locationInput} placeholder="Nereden?" placeholderTextColor={COLORS.textMuted} value={pickup} onChangeText={setPickup} />
        </View>
        <View style={styles.locationDivider} />
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.danger }]} />
          <TextInput style={styles.locationInput} placeholder="Nereye?" placeholderTextColor={COLORS.textMuted} value={destination} onChangeText={setDestination} />
        </View>
      </GlassCard>

      {/* Hızlı Konumlar */}
      <Text style={styles.sectionTitle}>📍 Popüler Konumlar</Text>
      <View style={styles.quickLocations}>
        {quickLocations.map(loc => (
          <TouchableOpacity key={loc} style={styles.quickLocationBtn} onPress={() => !pickup ? setPickup(loc) : setDestination(loc)}>
            <Text style={styles.quickLocationText}>{loc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Araç Tipleri */}
      <Text style={styles.sectionTitle}>🚗 Araç Tipi</Text>
      <View style={styles.vehicleTypes}>
        {vehicles.map(v => (
          <TouchableOpacity key={v.id} style={[styles.vehicleCard, selectedVehicle === v.id && { borderColor: v.color, borderWidth: 2 }]} onPress={() => setSelectedVehicle(v.id)}>
            <Ionicons name={v.icon} size={28} color={v.color} />
            <Text style={styles.vehicleName}>{v.name}</Text>
            <Text style={[styles.vehiclePrice, { color: v.color }]}>{v.price}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientButton onPress={handleRequest} title="🚕 Taksi Çağır" loading={loading} style={{ marginTop: 20 }} />
    </ScrollView>
  );
};

// ============================================
// PROFILE SCREEN - Çalışan Butonlar
// ============================================
const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [rides, setRides] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showRidesModal, setShowRidesModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newAddressTitle, setNewAddressTitle] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  const api = useApi();
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    const fetchAll = async () => {
      const p = await api('/profile');
      if (p) { setProfile(p); setEditName(p.fullName || ''); setEditEmail(p.email || ''); setEditPhone(p.phone || ''); }
      const o = await api('/food/orders');
      if (o) setOrders(o);
      const r = await api('/ride/history');
      if (r) setRides(r);
      const a = await api('/addresses');
      if (a) setAddresses(a);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { Alert.alert('Hata', 'Tüm alanları doldurun.'); return; }
    const result = await api('/profile/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
    if (result?.message?.includes('başarı')) {
      Alert.alert('Başarılı', result.message);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } else {
      Alert.alert('Hata', result?.message || 'Bir hata oluştu.');
    }
  };

  const handleUpdateProfile = async () => {
    const result = await api('/profile', { method: 'PUT', body: JSON.stringify({ fullName: editName, email: editEmail, phone: editPhone }) });
    if (result) {
      Alert.alert('Başarılı', 'Profil güncellendi.');
      setShowEditModal(false);
      const p = await api('/profile');
      if (p) setProfile(p);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddressTitle || !newAddressText) { Alert.alert('Hata', 'Tüm alanları doldurun.'); return; }
    const result = await api('/addresses', { method: 'POST', body: JSON.stringify({ title: newAddressTitle, address: newAddressText }) });
    if (result) {
      Alert.alert('Başarılı', 'Adres eklendi.');
      setShowAddressModal(false);
      setNewAddressTitle('');
      setNewAddressText('');
      const a = await api('/addresses');
      if (a) setAddresses(a);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: logout }
    ]);
  };

  if (loading) {
    return <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 120 }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={45} color={COLORS.primary} />
        </View>
        <Text style={styles.profileName}>{profile?.fullName || profile?.username}</Text>
        <Text style={styles.profileUsername}>@{profile?.username}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.stats?.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Sipariş</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.stats?.totalRides || 0}</Text>
            <Text style={styles.statLabel}>Yolculuk</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>₺{profile?.stats?.balance || '0'}</Text>
            <Text style={styles.statLabel}>Bakiye</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Menu */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          <Text style={styles.menuText}>Profili Düzenle</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAddressModal(true)}>
          <Ionicons name="location-outline" size={22} color={COLORS.purple} />
          <Text style={styles.menuText}>Adreslerim ({addresses.length})</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowOrdersModal(true)}>
          <Ionicons name="restaurant-outline" size={22} color={COLORS.orange} />
          <Text style={styles.menuText}>Sipariş Geçmişi ({orders.length})</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowRidesModal(true)}>
          <Ionicons name="car-outline" size={22} color={COLORS.success} />
          <Text style={styles.menuText}>Yolculuk Geçmişi ({rides.length})</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
          <Ionicons name="lock-closed-outline" size={22} color={COLORS.pink} />
          <Text style={styles.menuText}>Şifre Değiştir</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={[styles.menuText, { color: COLORS.danger }]}>Çıkış Yap</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Şifre Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Şifre Değiştir</Text>
            <TextInput style={styles.modalInput} placeholder="Mevcut Şifre" placeholderTextColor={COLORS.textMuted} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            <TextInput style={styles.modalInput} placeholder="Yeni Şifre" placeholderTextColor={COLORS.textMuted} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <GradientButton onPress={handleChangePassword} title="Değiştir" />
            <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>İptal</Text></TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Profil Düzenle Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Profili Düzenle</Text>
            <TextInput style={styles.modalInput} placeholder="Ad Soyad" placeholderTextColor={COLORS.textMuted} value={editName} onChangeText={setEditName} />
            <TextInput style={styles.modalInput} placeholder="E-posta" placeholderTextColor={COLORS.textMuted} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />
            <TextInput style={styles.modalInput} placeholder="Telefon" placeholderTextColor={COLORS.textMuted} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <GradientButton onPress={handleUpdateProfile} title="Kaydet" />
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>İptal</Text></TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Adres Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Yeni Adres</Text>
            {addresses.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.addressListTitle}>Mevcut Adresler:</Text>
                {addresses.map(a => (
                  <View key={a.id} style={styles.addressListItem}>
                    <Text style={styles.addressListText}>• {a.title}: {a.address}</Text>
                  </View>
                ))}
              </View>
            )}
            <TextInput style={styles.modalInput} placeholder="Başlık (Ev, İş...)" placeholderTextColor={COLORS.textMuted} value={newAddressTitle} onChangeText={setNewAddressTitle} />
            <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Adres" placeholderTextColor={COLORS.textMuted} value={newAddressText} onChangeText={setNewAddressText} multiline />
            <GradientButton onPress={handleAddAddress} title="Ekle" colors={[COLORS.purple, COLORS.pink]} />
            <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Kapat</Text></TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Siparişler Modal */}
      <Modal visible={showOrdersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: height * 0.7 }]}>
            <Text style={styles.modalTitle}>🍽️ Sipariş Geçmişi</Text>
            <ScrollView>
              {orders.length === 0 ? (
                <Text style={styles.emptyText}>Henüz sipariş yok</Text>
              ) : (
                orders.map(o => (
                  <View key={o.id} style={styles.historyItem}>
                    <View style={[styles.historyIcon, { backgroundColor: `${COLORS.orange}25` }]}>
                      <Ionicons name="restaurant" size={20} color={COLORS.orange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>Sipariş #{o.id}</Text>
                      <Text style={styles.historyDate}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: COLORS.orange }]}>₺{parseFloat(o.total_price).toFixed(2)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowOrdersModal(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Kapat</Text></TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Yolculuklar Modal */}
      <Modal visible={showRidesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: height * 0.7 }]}>
            <Text style={styles.modalTitle}>🚗 Yolculuk Geçmişi</Text>
            <ScrollView>
              {rides.length === 0 ? (
                <Text style={styles.emptyText}>Henüz yolculuk yok</Text>
              ) : (
                rides.map(r => (
                  <View key={r.id} style={styles.historyItem}>
                    <View style={[styles.historyIcon, { backgroundColor: `${COLORS.primary}25` }]}>
                      <Ionicons name="car" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>Yolculuk #{r.id}</Text>
                      <Text style={styles.historyDate}>{new Date(r.created_at).toLocaleDateString('tr-TR')}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: COLORS.primary }]}>₺{parseFloat(r.fare).toFixed(2)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowRidesModal(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Kapat</Text></TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </ScrollView>
  );
};



// ============================================
// MESSAGE SCREEN - WhatsApp Style User List
// ============================================
const MessageScreen = () => {
  const { userId, token } = useContext(AuthContext);
  const api = useApi();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const flatListRef = useRef(null);

  // Kullanıcıları çek
  useEffect(() => {
    api('/api/users').then(setUsers);
  }, []);

  // Cleanup - component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  // Chat aç
  const openChat = async (user) => {
    // Eski socket'i kapat
    if (socket) {
      socket.close();
    }
    setSelectedUser(user);
    // Geçmiş mesajları yükle
    const oldMessages = await api(`/api/messages/${user.id}`);
    setMessages(oldMessages);
    // WebSocket aç
    const ws = new WebSocket(`ws://192.168.0.13:3000/?token=${token}`);
    ws.onopen = () => console.log('✅ WebSocket connected');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // Açık chat'e ait mesajları filtrele
      if ((msg.from === user.id && msg.to === userId) || 
          (msg.from === userId && msg.to === user.id)) {
        // created_at yoksa şu anki zamanı ekle
        if (!msg.created_at) {
          msg.created_at = new Date().toISOString();
        }
        setMessages(prev => [...prev, msg]);
      }
    };
    ws.onclose = () => console.log('❌ WebSocket disconnected');
    setSocket(ws);
  };

  // Mesaj gönder
  const sendMessage = () => {
    if (!text.trim() || !socket || !selectedUser) return;
    const payload = {
      to: selectedUser.id,
      token,
      text
    };
    socket.send(JSON.stringify(payload));
    // Mesajı hemen ekle
    setMessages(prev => [...prev, { 
      from: MY_USER_ID, 
      to: selectedUser.id, 
      text,
      created_at: new Date().toISOString() // Saat bilgisini ekle
    }]);
    setText('');
    
    // Alta scroll
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Geri dön
  const goBack = () => {
    if (socket) {
      socket.close();
    }
    setSelectedUser(null);
    setMessages([]);
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {!selectedUser ? (
        <View style={{ flex: 1, padding: 10 }}>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            marginBottom: 20, 
            paddingHorizontal: 10,
            color: COLORS.text
          }}>
            Mesajlar
          </Text>
          {users.map(u => (
            <TouchableOpacity 
              key={u.id} 
              onPress={() => openChat(u)}
              style={{
                backgroundColor: COLORS.card,
                padding: 16,
                marginBottom: 10,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border
              }}
            >
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: COLORS.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14
              }}>
                <Text style={{ 
                  color: COLORS.text, 
                  fontSize: 22, 
                  fontWeight: 'bold' 
                }}>
                  {u.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 17, 
                fontWeight: '600',
                color: COLORS.text
              }}>
                {u.username}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            backgroundColor: COLORS.backgroundLight,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border
          }}>
            <TouchableOpacity 
              onPress={goBack} 
              style={{ 
                marginRight: 14,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.surface,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: 20, color: COLORS.text }}>←</Text>
            </TouchableOpacity>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}>
              <Text style={{ 
                color: COLORS.text, 
                fontSize: 19, 
                fontWeight: 'bold' 
              }}>
                {selectedUser.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={{ 
              fontSize: 19, 
              fontWeight: '600',
              color: COLORS.text
            }}>
              {selectedUser.username}
            </Text>
          </View>

          {/* Mesajlar */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, i) => i.toString()}
            contentContainerStyle={{ padding: 12 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMyMessage = Number(item.from) === Number(MY_USER_ID);
              
              // Saat ve dakika formatla
              const formatTime = (timestamp) => {
                if (!timestamp) return '';
                try {
                  const date = new Date(timestamp);
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  return `${hours}:${minutes}`;
                } catch (e) {
                  return '';
                }
              };
              
              return (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                  marginBottom: 10
                }}>
                  <View style={{
                    maxWidth: '75%',
                    backgroundColor: isMyMessage ? COLORS.primary : COLORS.card,
                    padding: 13,
                    paddingBottom: 8,
                    borderRadius: 18,
                    borderBottomRightRadius: isMyMessage ? 4 : 18,
                    borderBottomLeftRadius: isMyMessage ? 18 : 4,
                    borderWidth: 1,
                    borderColor: isMyMessage ? 'transparent' : COLORS.border
                  }}>
                    <Text style={{ 
                      color: COLORS.text,
                      fontSize: 15,
                      lineHeight: 20,
                      marginBottom: 4
                    }}>
                      {item.text}
                    </Text>
                    <Text style={{
                      color: isMyMessage ? 'rgba(255, 255, 255, 0.7)' : COLORS.textMuted,
                      fontSize: 11,
                      alignSelf: 'flex-end'
                    }}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Input Area */}
          <View style={{
            flexDirection: 'row',
            padding: 12,
            backgroundColor: COLORS.backgroundLight,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            alignItems: 'center'
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={sendMessage}
              placeholder="Mesaj yaz..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="send"
              blurOnSubmit={false}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 12,
                borderRadius: 22,
                marginRight: 10,
                backgroundColor: COLORS.surface,
                fontSize: 15,
                color: COLORS.text
              }}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={{
                backgroundColor: COLORS.primary,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ 
                color: COLORS.text, 
                fontSize: 20, 
                fontWeight: 'bold' 
              }}>
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};




// ============================================
// NAVIGATION
// ============================================
const AuthStack = createStackNavigator();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const Tab = createBottomTabNavigator();
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarIcon: ({ focused, color }) => {
        let iconName;
        if (route.name === 'Cüzdan') iconName = focused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Yemek') iconName = focused ? 'restaurant' : 'restaurant-outline';
        else if (route.name === 'Ride') iconName = focused ? 'car-sport' : 'car-sport-outline';
        else if (route.name === 'Mesajlar') iconName = focused ? 'paper-plane' : 'paper-plane-outline';
        else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={24} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Cüzdan" component={WalletScreen} />
    <Tab.Screen name="Yemek" component={FoodScreen} />
    <Tab.Screen name="Ride" component={RideScreen} />
    <Tab.Screen name="Mesajlar" component={MessageScreen} />
    <Tab.Screen name="Profil" component={ProfileScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { token, isLoading } = useContext(AuthContext);
  if (isLoading) return <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  return <NavigationContainer theme={DarkNavTheme}>{token ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
};

const App = () => <AuthProvider><RootNavigator /></AuthProvider>;

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: COLORS.background },
  authContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logoText: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  logoSubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5 },
  authForm: { gap: 12 },
  inputCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  authInput: { flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 15 },
  loginButton: { marginTop: 10 },
  registerLink: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },

  glassCard: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  gradientButton: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  gradientButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },

  screenContainer: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  searchBarContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 15, marginBottom: 15 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, height: '100%' },

  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },

  balanceCard: { borderRadius: 20, padding: 25, marginBottom: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceAmount: { color: COLORS.text, fontSize: 38, fontWeight: '700', marginVertical: 8 },
  addMoneyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, alignSelf: 'flex-start', marginTop: 10 },
  addMoneyText: { color: COLORS.text, fontWeight: '600', marginLeft: 6 },

  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { color: COLORS.textSecondary, fontSize: 12 },

  transactionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  transactionIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  transactionDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 25 },
  modalContent: { padding: 25, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalInput: { backgroundColor: COLORS.backgroundLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16, marginBottom: 12 },
  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  quickAmountBtn: { backgroundColor: COLORS.backgroundLight, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  quickAmountText: { color: COLORS.text, fontWeight: '600' },
  modalCancel: { marginTop: 15, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted },

  categoryScroll: { marginBottom: 15 },
  categoryBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  categoryBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  foodGrid: { paddingBottom: 120 },
  foodCard: { flex: 1, margin: 5, padding: 15, alignItems: 'center' },
  foodEmoji: { fontSize: 40, marginBottom: 8 },
  foodName: { color: COLORS.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  foodDesc: { color: COLORS.textMuted, fontSize: 11, marginVertical: 4 },
  foodPrice: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  foodActions: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginHorizontal: 12 },
  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  cartCount: { color: COLORS.textSecondary, fontSize: 13 },
  cartTotal: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  orderBtn: { paddingHorizontal: 25 },

  mapPlaceholder: { height: 180, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, position: 'relative' },
  mapPins: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapPin: { position: 'absolute' },
  mapText: { color: COLORS.textMuted, fontSize: 18 },
  locationCard: { padding: 5, marginBottom: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  locationDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  locationInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  locationDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 36 },
  quickLocations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLocationBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border },
  quickLocationText: { color: COLORS.textSecondary, fontSize: 13 },
  vehicleTypes: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  vehicleName: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginTop: 8 },
  vehiclePrice: { fontSize: 12, marginTop: 4 },

  driverCard: { flexDirection: 'row', padding: 18, marginBottom: 15 },
  driverAvatar: { width: 65, height: 65, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  driverInfo: { flex: 1 },
  driverName: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  driverCar: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  driverPlate: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  ratingText: { color: COLORS.text, marginLeft: 4, fontWeight: '600' },
  routeCard: { padding: 18 },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  routeText: { color: COLORS.text, fontSize: 14 },
  routeLine: { width: 2, height: 25, backgroundColor: COLORS.border, marginLeft: 5, marginVertical: 4 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border },
  fareLabel: { color: COLORS.textSecondary },
  fareAmount: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', marginTop: 15 },
  cancelText: { color: COLORS.danger, fontWeight: '600' },

  profileHeader: { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 85, height: 85, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  profileUsername: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 22, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  menuSection: { marginTop: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 14, marginBottom: 10 },
  menuText: { flex: 1, color: COLORS.text, fontSize: 15, marginLeft: 12 },

  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  historyDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700' },
  addressListTitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 },
  addressListItem: { marginBottom: 5 },
  addressListText: { color: COLORS.text, fontSize: 13 },

  tabBar: { backgroundColor: COLORS.card, borderTopWidth: 0, height: 65, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 8 },
});

registerRootComponent(App);
