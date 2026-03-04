// app/storeman/index.tsx — Dashboard Storeman (Clean & Responsive)

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
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function StoremanDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalProducts: 0,
    lowStockItems: 0,
    pendingStock: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: products } = await supabase
        .from('products')
        .select('*, tenants(tenant_name), stocks(available_quantity)')
        .eq('is_active', true);

      const totalProducts = products?.length || 0;

      const lowStock =
        products?.filter((p) => {
          const s = Array.isArray(p.stocks) ? p.stocks[0] : p.stocks;
          return (s?.available_quantity ?? 0) <= 5;
        }) || [];

      setStats({
        totalTenants: tenantCount || 0,
        totalProducts,
        lowStockItems: lowStock.length,
        pendingStock: 0,
      });

      setLowStockProducts(lowStock.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#E597A0" />
      </View>
    );
  }

  const welcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';  
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E597A0']} />
      }
    >
      {/* ── Welcome Header ── */}
      <View className="px-6 py-6 pb-2">
        <Text className="text-gray-400 text-sm font-medium">{welcomeMessage()}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1">
          {profile?.full_name || 'Storeman'}
        </Text>
      </View>

      {/* ── Stats Grid ── */}
      <View className="flex-row flex-wrap px-4 py-2 justify-between">
        <StatCard
          title="Total Tenant"
          value={stats.totalTenants.toString()}
          icon="storefront"
          color="#E597A0"
          isTablet={isTablet}
        />
        <StatCard
          title="Total Produk"
          value={stats.totalProducts.toString()}
          icon="inventory"
          color="#FFB347"
          isTablet={isTablet}
        />
        <StatCard
          title="Stok Tipis"
          value={stats.lowStockItems.toString()}
          icon="warning"
          color="#FF6B6B"
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
            title="Daftar Tenant"
            icon="storefront"
            onPress={() => router.push('/storeman/tenants')}
            isTablet={isTablet}
          />
          <QuickMenu
            title="Tambah Produk"
            icon="add-circle-outline"
            onPress={() => router.push('/storeman/products')}
            isTablet={isTablet}
          />
          <QuickMenu
            title="Kelola Stok"
            icon="move-to-inbox"
            onPress={() => router.push('/storeman/stock')}
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

      {/* ── Low Stock Alert Section ── */}
      <View className="px-6 mt-8 mb-10">
        <View className="flex-row justify-between items-center mb-5">
          <View className="flex-row items-center">
            <View className="w-1 h-6 bg-[#E597A0] rounded-full mr-3" />
            <Text className="text-lg font-bold text-gray-800">Cek Stok Barang</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/storeman/stock')}>
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

                  <Text
                    style={{
                      fontSize: 11,
                      color: '#9CA3AF',
                      marginTop: 4,
                      letterSpacing: 0.4,
                    }}
                  >
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
            )
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
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  isTablet: boolean;
}) {
  return (
    <Surface
      className="mb-4 rounded-3xl bg-white overflow-hidden"
      style={{ 
        width: isTablet ? '23.5%' : '48%',
      elevation: 0,
      borderRadius: 20,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#F0F0F0',
      }}
    >
      <View className="p-5">
        <View className="flex-row justify-between items-start mb-4">
          <View 
            className="w-12 h-12 rounded-2xl justify-center items-center" 
            style={{ backgroundColor: `${color}15` }}
          >
            <MaterialIcons name={icon as any} size={26} color={color} />
          </View>
          <MaterialIcons name="trending-up" size={16} color="#10B981" />
        </View>
        <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        <Text className="text-[11px] text-gray-400 font-medium uppercase mt-1 tracking-wide">
          {title}
        </Text>
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
        {/* Icon Container */}
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

        {/* Label */}
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

        {/* Arrow */}
        <MaterialIcons name="chevron-right" size={16} color="#CCCCCC" style={{ marginLeft: 4 }} />
      </Surface>
    </TouchableOpacity>
  );
}
