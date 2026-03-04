// pages/StockHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ACCENT = '#E597A0';

type Role = 'owner' | 'storeman';

type Props = {
  role: Role;
};

export default function StockHistoryPage({ role }: Props) {
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          *,
          products(product_name),
          profiles(user_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const isSale = item.change_type === 'sale';
    const qtyChange = item.new_quantity - item.old_quantity;
    const isIncrease = qtyChange > 0;

    return (
      <View style={s.logItem}>
        <View style={[s.iconBg, { backgroundColor: isSale ? '#E0F2FE' : isIncrease ? '#DCFCE7' : '#FEE2E2' }]}>
          <MaterialIcons 
            name={isSale ? 'shopping-cart' : isIncrease ? 'add' : 'remove'} 
            size={20} 
            color={isSale ? '#0369A1' : isIncrease ? '#15803D' : '#B91C1C'} 
          />
        </View>

        <View style={s.logInfo}>
          <Text style={s.productName}>{item.products?.product_name || 'Produk Terhapus'}</Text>
          <Text style={s.logMeta}>
            Oleh: <Text style={s.bold}>{item.profiles?.user_name || 'User'}</Text> • {isSale ? 'Penjualan' : 'Manual'}
          </Text>
          <Text style={s.logTime}>
            {format(new Date(item.created_at), 'd MMM yyyy, HH:mm', { locale: id })}
          </Text>
        </View>

        <View style={s.qtySection}>
          <Text style={s.qtyRange}>
            {item.old_quantity} → {item.new_quantity}
          </Text>
          <Text style={[s.qtyChange, { color: isIncrease ? '#16A34A' : '#DC2626' }]}>
            {isIncrease ? '+' : ''}{qtyChange}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Riwayat Perubahan Stok</Text>
          <Text style={s.subtitle}>
            {role === 'owner' ? 'Audit log stok untuk owner' : 'Audit log stok untuk storeman'}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.reloadBtn}>
          <MaterialIcons name="refresh" size={22} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={s.list}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialIcons name="history" size={48} color="#D1D5DB" />
              <Text style={s.emptyText}>Belum ada riwayat perubahan</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  reloadBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  logItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0',
  },
  iconBg: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  logInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  logMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  bold: { fontWeight: '700', color: '#374151' },
  logTime: { fontSize: 10, color: '#9CA3AF', marginTop: 3 },
  qtySection: { alignItems: 'flex-end', marginLeft: 10 },
  qtyRange: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  qtyChange: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontWeight: '500' },
});

