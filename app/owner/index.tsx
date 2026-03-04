// app/owner/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function OwnerDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayTransactions: 0,
    totalProducts: 0,
    lowStockItems: 0,
    pendingStock: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // 1. Today's Transactions
      const { data: tData, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_status', 'completed')
        .gte('created_at', todayIso);
      if (tError) throw tError;

      const revenue =
        tData?.reduce((acc, curr) => acc + (curr.subtotal + curr.tax - (curr.discount || 0)), 0) || 0;

      // 2. Products & Low Stock
      const { data: pData, error: pError } = await supabase
        .from('products')
        .select('*, tenants(tenant_name), stocks(available_quantity)')
        .eq('is_active', true);
      if (pError) throw pError;

      const totalProducts = pData?.length || 0;
      const lowStock =
        pData?.filter((p) => {
          const s = Array.isArray(p.stocks) ? p.stocks[0] : p.stocks;
          return (s?.available_quantity ?? 0) <= 5;
        }) || [];

      // 3. Recent Transactions
      const { data: recentT, error: rtError } = await supabase
        .from('transactions')
        .select('*, profiles(user_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (rtError) throw rtError;

      setStats({
        todayRevenue: revenue,
        todayTransactions: tData?.length || 0,
        totalProducts,
        lowStockItems: lowStock.length,
        pendingStock: 0,
      });
      setRecentTransactions(recentT || []);
      setLowStockProducts(lowStock.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const welcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#E597A0" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E597A0']} />
      }
    >
      {/* ── Welcome Header ── */}
      <View className="px-6 py-6 pb-2 flex-row justify-between items-start">
        <View>
          <Text className="text-gray-400 text-sm font-medium">{welcomeMessage()}</Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1">Halo, Owner!</Text>
          <Text className="text-xs text-gray-400 mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </Text>
        </View>
        <TouchableOpacity
          className="w-10 h-10 rounded-2xl bg-white justify-center items-center mt-1"
          style={{ borderWidth: 1, borderColor: '#F0F0F0' }}
        >
          <MaterialIcons name="notifications-none" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Grid ── */}
      <View className="flex-row flex-wrap px-4 py-2 justify-between">
        <StatCard
          title="Omzet Hari Ini"
          value={`Rp ${stats.todayRevenue.toLocaleString('id-ID')}`}
          icon="payments"
          color="#4CAF50"
          isTablet={isTablet}
          fullWidth
        />
        <StatCard
          title="Transaksi"
          value={stats.todayTransactions.toString()}
          icon="shopping-cart"
          color="#2196F3"
          isTablet={isTablet}
        />
        <StatCard
          title="Total Produk"
          value={stats.totalProducts.toString()}
          icon="inventory"
          color="#FF9800"
          isTablet={isTablet}
        />    
        <StatCard
          title="Stok Tipis"
          value={stats.lowStockItems.toString()}
          icon="warning"
          color="#F44336"
          isTablet={isTablet}
        />
        <StatCard
          title="Kedatangan"
          value={stats.pendingStock.toString()}
          icon="local-shipping"
          color="#4D96FF"
          isTablet={isTablet}
        />
      </View>

      {/* ── Quick Menu ── */}
      <View className="px-6 mt-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">Akses Cepat</Text>
        <View className="flex-row flex-wrap justify-between">
          <QuickMenu
            title="Tambah Produk"
            icon="add-circle-outline"
            onPress={() => router.push('/owner/products/')}
            isTablet={isTablet}
          />
          <QuickMenu
            title="Laporan Sales"
            icon="bar-chart"
            onPress={() => router.push('/owner/reports/')}
            isTablet={isTablet}
          />
          <QuickMenu
            title="Manajemen Tenant"
            icon="storefront"
            onPress={() => {}}
            isTablet={isTablet}
          />
          <QuickMenu
            title="Pengaturan"
            icon="settings"
            onPress={() => {}}
            isTablet={isTablet}
          />
        </View>
      </View>

      {/* ── Recent Transactions ── */}
      <View className="px-6 mt-8">
        <View className="flex-row justify-between items-center mb-5">
          <View className="flex-row items-center">
            <View className="w-1 h-6 bg-[#E597A0] rounded-full mr-3" />
            <Text className="text-lg font-bold text-gray-800">Transaksi Terbaru</Text>
          </View>
          <TouchableOpacity onPress={() => {}}>
            <Text className="text-sm font-semibold" style={{ color: '#E597A0' }}>
              Lihat Semua
            </Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((item) => {
            const total = item.subtotal + item.tax - (item.discount || 0);
            const isCompleted = item.transaction_status === 'completed';
            return (
              <TouchableOpacity
                key={item.transaction_id}
                onPress={() => router.push(`/owner/reports/${item.transaction_id}`)}
                activeOpacity={0.7}
                style={{
                  elevation: 0,
                  borderRadius: 18,
                  backgroundColor: '#FAFAFA',
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    backgroundColor: isCompleted ? '#F0FDF4' : '#FFFBEB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                    flexShrink: 0,
                  }}
                >
                  <MaterialIcons
                    name={isCompleted ? 'check-circle' : 'schedule'}
                    size={20}
                    color={isCompleted ? '#16A34A' : '#D97706'}
                  />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#222222' }}>
                    #{item.transaction_id.toString().slice(-6)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                    {format(new Date(item.created_at), 'HH:mm')} •{' '}
                    {item.profiles?.user_name || 'Kasir'}
                  </Text>
                </View>

                {/* Amount & Badge */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                    Rp {total.toLocaleString('id-ID')}
                  </Text>
                  <View
                    style={{
                      marginTop: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: isCompleted ? '#DCFCE7' : '#FEF9C3',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 0.4,
                        color: isCompleted ? '#15803D' : '#A16207',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.transaction_status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="items-center py-8">
            <MaterialIcons name="receipt-long" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-2 font-medium">Belum ada transaksi hari ini</Text>
          </View>
        )}
      </View>

      {/* ── Low Stock Alert Section ── */}
      <View className="px-6 mt-8 mb-10">
        <View className="flex-row justify-between items-center mb-5">
          <View className="flex-row items-center">
            <View className="w-1 h-6 bg-[#F44336] rounded-full mr-3" />
            <Text className="text-lg font-bold text-gray-800">Cek Stok Barang</Text>
          </View>
          <TouchableOpacity onPress={() => {}}>
            <Text className="text-sm font-semibold" style={{ color: '#E597A0' }}>
              Lihat Semua
            </Text>
          </TouchableOpacity>
        </View>

        {lowStockProducts.length > 0 ? (
          lowStockProducts.map((p) => {
            const s = Array.isArray(p.stocks) ? p.stocks[0] : p.stocks;
            const qty = s?.available_quantity ?? 0;

            return (
              <Surface
                key={p.product_id}
                style={{
                  elevation: 0,
                  borderRadius: 18,
                  backgroundColor: '#FAFAFA',
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                {/* Image / Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                    flexShrink: 0,
                  }}
                >
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="fastfood" size={20} color="#9CA3AF" />
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#222222',
                      lineHeight: 18,
                      letterSpacing: 0.1,
                    }}
                  >
                    {p.product_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, letterSpacing: 0.4 }}>
                    {p.tenants?.tenant_name ?? 'Produk Selasar Kafe'}
                  </Text>
                </View>

                {/* Stock Badge */}
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: qty === 0 ? '#FEF2F2' : '#FFF7ED',
                    marginLeft: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: qty === 0 ? '#DC2626' : '#C2410C',
                      letterSpacing: 0.3,
                    }}
                  >
                    {qty === 0 ? 'HABIS' : `SISA ${qty}`}
                  </Text>
                </View>
              </Surface>
            );
          })
        ) : (
          <View className="items-center py-8">
            <MaterialIcons name="check-circle" size={48} color="#A7F3D0" />
            <Text className="text-gray-400 mt-2 font-medium">Stok aman terkendali</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────
// StatCard Component
// ─────────────────────────────────────────
function StatCard({
  title,
  value,
  icon,
  color,
  isTablet,
  fullWidth = false,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  isTablet: boolean;
  fullWidth?: boolean;
}) {
  const cardWidth = fullWidth ? '100%' : isTablet ? '23.5%' : '48%';

  return (
    <Surface
      className="mb-4 overflow-hidden"
      style={{
        width: cardWidth,
        elevation: 0,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F0F0F0',
      }}
    >
      <View className={fullWidth ? 'p-5 flex-row items-center' : 'p-5'}>
        <View
          className={`w-12 h-12 rounded-2xl justify-center items-center ${fullWidth ? 'mr-4' : 'mb-4'}`}
          style={{ backgroundColor: `${color}15` }}
        >
          <MaterialIcons name={icon as any} size={26} color={color} />
        </View>
        <View style={fullWidth ? { flex: 1 } : undefined}>
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          <Text className="text-[11px] text-gray-400 font-medium uppercase mt-1 tracking-wide">
            {title}
          </Text>
        </View>
        {!fullWidth && (
          <View style={{ position: 'absolute', top: 16, right: 16 }}>
            <MaterialIcons name="trending-up" size={16} color="#10B981" />
          </View>
        )}
      </View>
    </Surface>
  );
}

// ─────────────────────────────────────────
// QuickMenu Component
// ─────────────────────────────────────────
function QuickMenu({
  title,
  icon,
  onPress,
  isTablet,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      style={{ width: isTablet ? '23.5%' : '48%', marginBottom: 12 }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Surface
        style={{
          elevation: 0,
          borderRadius: 18,
          backgroundColor: '#FAFAFA',
          borderWidth: 1,
          borderColor: '#F0F0F0',
          paddingVertical: 16,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',   
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11, 
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <MaterialIcons name={icon as any} size={19} color="#6b7280" />
        </View>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: 12.5,
            fontWeight: '600',
            color: '#222222',
            lineHeight: 17,
            letterSpacing: 0.1,
          }}
        >
          {title}
        </Text>
        <MaterialIcons name="chevron-right" size={16} color="#CCCCCC" style={{ marginLeft: 4 }} />
      </Surface>
    </TouchableOpacity>
  );
} 