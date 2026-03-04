// pages/StocksPage.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const ACCENT = '#E597A0';
const PADDING = 16;
const GAP = 10;

type Role = 'owner' | 'storeman' | 'cashier';

type Props = {
  role: Role;
};

export default function StocksPage({ role }: Props) {
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);
  const { width, height } = useWindowDimensions();
  const isPortraitPhone = width < 600 && width < height;
  const COLS = isPortraitPhone ? 2 : 4;
  const cardWidth = (width - PADDING * 2 - GAP * (COLS - 1)) / COLS;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newStock, setNewStock] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, tenants(tenant_name), stocks(available_quantity)')
        .eq('is_active', true)
        .order('product_name');
      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (product: any) => {
    setSelectedProduct(product);
    const stockData = Array.isArray(product.stocks) ? product.stocks[0] : product.stocks;
    setNewStock(stockData?.available_quantity?.toString() || '0');
    setVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedProduct || !profile) return;
    setUpdating(true);
    try {
      const stockData = Array.isArray(selectedProduct.stocks) ? selectedProduct.stocks[0] : selectedProduct.stocks;
      const oldQty = stockData?.available_quantity ?? 0;
      const newQty = parseInt(newStock, 10) || 0;

      const { error } = await supabase.from('stocks').upsert({
        product_id: selectedProduct.product_id,
        available_quantity: newQty,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'product_id' });
      
      if (error) throw error;

      const { error: logError } = await supabase.from('stock_logs').insert({
        product_id: selectedProduct.product_id,
        user_id: profile.id,
        old_quantity: oldQty,
        new_quantity: newQty,
        change_type: 'manual',
      });

      if (logError) {
        console.error('Stock Log Error:', logError);
        alert('Gagal mencatat riwayat stok: ' + logError.message);
      }

      Alert.alert('Sukses', 'Stok berhasil diperbarui');
      setVisible(false);
      fetchProducts();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const rows: any[][] = [];
  for (let i = 0; i < filtered.length; i += COLS) {
    rows.push(filtered.slice(i, i + COLS));
  }

  const historyRoute = role === 'owner' ? '/owner/stock/history' : '/storeman/stock/history';
  const canViewHistory = role === 'owner' || role === 'storeman';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Kelola Stok</Text>
          <Text style={s.subheading}>Update ketersediaan produk</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* History button — only visible to owner & storeman */}
          {canViewHistory && (
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={() => router.push(historyRoute)}
            >
              <MaterialIcons name="history" size={20} color={ACCENT} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.refreshBtn} onPress={fetchProducts}>
            <MaterialIcons name="refresh" size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchRow}>
        <MaterialIcons name="search" size={18} color="#C0C4CC" />
        <TextInput
          style={s.searchInput}
          placeholder="Cari produk..."
          placeholderTextColor="#C0C4CC"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color="#C0C4CC" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: PADDING, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <MaterialIcons name="inventory-2" size={30} color="#D1D5DB" />
              </View>
              <Text style={s.emptyText}>Tidak ada produk</Text>
            </View>
          }
          renderItem={({ item: row }) => (
            <View style={s.row}>
              {row.map((item: any) => {
                const stockData = Array.isArray(item.stocks) ? item.stocks[0] : item.stocks;
                const stock = stockData?.available_quantity ?? 0;
                const isEmpty = stock === 0;
                const isLow = stock > 0 && stock <= 5;
                const badgeBg = isEmpty ? '#FEE2E2' : isLow ? '#FEF3C7' : '#ECFDF5';
                const badgeColor = isEmpty ? '#B91C1C' : isLow ? '#92400E' : '#10B981';
                const dotColor = isEmpty ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';
                const iconName = isEmpty ? 'error-outline' : isLow ? 'warning' : 'check-circle';
                const iconBg = isEmpty ? '#FEE2E2' : isLow ? '#FEF3C7' : ACCENT + '15';
                const iconColor = isEmpty ? '#B91C1C' : isLow ? '#92400E' : ACCENT;

                return (
                  <TouchableOpacity
                    key={item.product_id}
                    style={[s.card, { width: cardWidth }]}
                    onPress={() => openModal(item)}
                    activeOpacity={0.8}
                  >
                    <View style={s.badgeRow}>
                      <View style={[s.badge, { backgroundColor: badgeBg }]}>
                        <View style={[s.dot, { backgroundColor: dotColor }]} />
                        <Text style={[s.badgeText, { color: badgeColor }]}>
                          {isEmpty ? 'Habis' : isLow ? 'Menipis' : 'Tersedia'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.cardImageWrap}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={s.productImage} />
                      ) : (
                        <View style={[s.cardIcon, { backgroundColor: iconBg }]}>
                          <MaterialIcons name={iconName as any} size={20} color={iconColor} />
                        </View>
                      )}
                    </View>

                    <Text style={s.productName} numberOfLines={2}>{item.product_name}</Text>
                    <Text style={s.tenantLabel} numberOfLines={1}>
                      {item.tenants?.tenant_name ?? 'Produk Sendiri'}
                    </Text>

                    <View style={[s.stockRow, { backgroundColor: badgeBg }]}>
                      <Text style={[s.stockNum, { color: badgeColor }]}>{stock}</Text>
                      <Text style={[s.stockLabel, { color: badgeColor }]}>stok</Text>
                    </View>

                    <View style={s.editBtn}>
                      <MaterialIcons name="edit" size={13} color={ACCENT} />
                      <Text style={s.editText}>Update</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                <View key={`ph-${i}`} style={{ width: cardWidth }} />
              ))}
            </View>
          )}
        />
      )}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              {selectedProduct?.image_url ? (
                <Image source={{ uri: selectedProduct.image_url }} style={s.modalHeroImage} />
              ) : (
                <View style={s.modalHeroPlaceholder}>
                  <MaterialIcons name="inventory-2" size={24} color={ACCENT} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.modalTitle}>Update Stok</Text>
                <Text style={s.modalSub} numberOfLines={2}>
                  {selectedProduct?.product_name}
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setVisible(false)}>
                <MaterialIcons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={s.stockInputWrap}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setNewStock((prev) => Math.max(0, parseInt(prev || '0', 10) - 1).toString())}
                activeOpacity={0.7}
              >
                <MaterialIcons name="remove" size={20} color={ACCENT} />
              </TouchableOpacity>

              <TextInput
                style={s.stockInput}
                value={newStock}
                onChangeText={setNewStock}
                keyboardType="numeric"
                textAlign="center"
              />

              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setNewStock((prev) => (parseInt(prev || '0', 10) + 1).toString())}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={ACCENT} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={s.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { opacity: updating ? 0.6 : 1 }]}
                onPress={handleUpdate}
                disabled={updating}
                activeOpacity={0.85}
              >
                {updating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="check" size={16} color="#fff" />
                      <Text style={s.saveBtnText}>Update</Text>
                    </View>
                  )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: PADDING, paddingTop: 8, paddingBottom: 12,
  },
  heading: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subheading: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: PADDING, marginBottom: 12,
    paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#111827' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 12,
    gap: 5,
  },

  badgeRow: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  cardIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  cardImageWrap: {
    width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: 4, marginTop: 4,
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  productName: { fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 17, marginTop: 2 },
  tenantLabel: { fontSize: 10, color: '#9CA3AF', lineHeight: 14 },

  stockRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, marginTop: 2,
  },
  stockNum: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  stockLabel: { fontSize: 10, fontWeight: '600' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 4,
    backgroundColor: ACCENT + '12',
    borderRadius: 8, paddingVertical: 6,
  },
  editText: { fontSize: 11, fontWeight: '700', color: ACCENT },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  modalBg: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 24,
  },
  modalHeroImage: {
    width: 56, height: 56, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  modalHeroPlaceholder: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: ACCENT + '15', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalSub: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },

  stockInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16, marginBottom: 24,
  },
  qtyBtn: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
  },
  stockInput: {
    width: 88, height: 56, fontSize: 26, fontWeight: '800',
    borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 14,
    color: '#111827', backgroundColor: '#FAFAFA',
  },

  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  cancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: 12, backgroundColor: ACCENT,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});