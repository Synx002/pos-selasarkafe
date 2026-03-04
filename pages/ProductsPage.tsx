// components/ProductsPage.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

const ACCENT       = '#C8576A';
const ACCENT_SOFT  = '#F7E8EB';
const ACCENT_MED   = '#E8A0AB';
const SURFACE      = '#FFFFFF';
const BG           = '#F5F4F2';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECOND  = '#6B7280';
const TEXT_LIGHT   = '#B0B5BE';
const BORDER       = '#EBEBEB';
const PADDING      = 16;
const GAP          = 10;

const emptyForm = {
  product_name: '',
  description: '',
  category: '',
  unit: '',
  purchase_price: '',
  selling_price: '',
  tenant_id: null as number | null,
};

type FormState = typeof emptyForm;

type ProductsPageProps = {
  role: 'owner' | 'storeman';
};

export default function ProductsPage({ role }: ProductsPageProps) {
  const { width } = useWindowDimensions();
  const COLS = width < 500 ? 2 : width < 900 ? 3 : 4;

  const [products, setProducts] = useState<any[]>([]);
  const [tenants, setTenants]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState<any | null>(null);
  const [form, setForm]                 = useState<FormState>(emptyForm);
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: prods }, { data: tens }] = await Promise.all([
        supabase
          .from('products')
          .select('*, tenants(tenant_name), stocks(available_quantity)')
          .eq('is_active', true)
          .order('product_name'),
        supabase
          .from('tenants')
          .select('*')
          .eq('status', true)
          .order('tenant_name'),
      ]);
      setProducts(prods || []);
      setTenants(tens || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const filtered = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = (product: any) => {
    Alert.alert('Hapus Produk', `Yakin hapus "${product.product_name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await supabase.from('products').update({ is_active: false }).eq('product_id', product.product_id);
          fetchData();
        },
      },
    ]);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setImageUri(null);
    setExistingImageUrl(null);
    setModalVisible(true);
  };

  const openDetail = (product: any) => {
    setDetailProduct(product);
    setDetailVisible(true);
  };

  const closeDetail = () => setDetailVisible(false);

  const openEdit = (product: any) => {
    setEditTarget(product);
    setForm({
      product_name:   product.product_name  || '',
      description:    product.description   || '',
      category:       product.category      || '',
      unit:           product.unit          || '',
      purchase_price: product.purchase_price?.toString() || '',
      selling_price:  product.selling_price?.toString()  || '',
      tenant_id:      product.tenant_id     ?? null,
    });
    setImageUri(null);
    setExistingImageUrl(product.image_url || null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Butuh izin galeri untuk mengunggah gambar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `product_${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
      const fd = new FormData();
      fd.append('file', { uri, name: fileName, type: contentType } as any);
      const { error } = await supabase.storage.from('products').upload(fileName, fd, { cacheControl: '3600', upsert: false });
      if (error) return null;
      return supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) {
      Alert.alert('Validasi', 'Nama produk wajib diisi.');
      return;
    }
    if (Number(form.selling_price) <= 0) {
      Alert.alert('Validasi', 'Harga jual harus lebih dari 0.');
      return;
    }

    setSaving(true);
    let finalImageUrl: string | null = existingImageUrl;

    if (imageUri) {
      setUploading(true);
      const uploaded = await uploadImage(imageUri);
      setUploading(false);
      if (!uploaded) {
        Alert.alert('Gagal Upload', 'Gambar gagal diunggah. Simpan tanpa gambar baru?', [
          { text: 'Batal', style: 'cancel', onPress: () => setSaving(false) },
          { text: 'Lanjutkan', onPress: () => proceedSave(existingImageUrl) },
        ]);
        return;
      }
      finalImageUrl = uploaded;
    }

    await proceedSave(finalImageUrl);
  };

  const proceedSave = async (imgUrl: string | null) => {
    const payload = {
      product_name:   form.product_name.trim(),
      description:    form.description.trim()  || null,
      category:       form.category.trim()     || null,
      unit:           form.unit.trim()         || null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price:  Number(form.selling_price),
      tenant_id:      form.tenant_id,
      is_active:      true,
      image_url:      imgUrl,
    };

    try {
      if (editTarget) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('product_id', editTarget.product_id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await supabase.from('stocks').upsert(
            { product_id: data.product_id, available_quantity: 0, last_updated: new Date().toISOString() },
            { onConflict: 'product_id' }
          );
        }
      }

      setModalVisible(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const stockData = Array.isArray(item.stocks) ? item.stocks[0] : item.stocks;
    const stock     = stockData?.available_quantity ?? 0;
    const low       = stock <= 5;

    return (
      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => openDetail(item)}>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: low ? '#FEF3C7' : '#ECFDF5' }]}>
            <View style={[s.dot, { backgroundColor: low ? '#F59E0B' : '#10B981' }]} />
            <Text style={[s.badgeText, { color: low ? '#92400E' : '#10B981' }]}>{stock} stok</Text>
          </View>
        </View>

        <View style={s.cardImageWrap}>
          {item.image_url
            ? <Image source={{ uri: item.image_url }} style={s.productImage} />
            : <View style={s.cardIcon}><MaterialIcons name="fastfood" size={20} color={ACCENT} /></View>
          }
        </View>

        <Text style={s.productName} numberOfLines={2}>{item.product_name}</Text>
        <Text style={s.tenantLabel} numberOfLines={1}>{item.tenants?.tenant_name ?? 'Produk Sendiri'}</Text>
        <Text style={s.price}>Rp {item.selling_price?.toLocaleString('id-ID')}</Text>
      </TouchableOpacity>
    );
  };

  const previewImage = imageUri || existingImageUrl;
  const isEditMode   = !!editTarget;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Produk</Text>
          <Text style={s.subheading}>{products.length} produk aktif</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchData}>
          <MaterialIcons name="refresh" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <MaterialIcons name="search" size={18} color={TEXT_LIGHT} />
        <TextInput
          style={s.searchInput}
          placeholder="Cari produk..."
          placeholderTextColor={TEXT_LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={TEXT_LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : (
        <FlatList
          data={filtered}
          key={COLS}
          numColumns={COLS}
          keyExtractor={(item) => item.product_id.toString()}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          contentContainerStyle={{ padding: PADDING, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}><MaterialIcons name="fastfood" size={30} color="#D1D5DB" /></View>
              <Text style={s.emptyText}>Belum ada produk</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.85}>
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Detail Product Modal */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={closeDetail}>
        <Pressable style={s.overlay} onPress={closeDetail}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            <View style={s.detailHeaderStrip}>
              {detailProduct?.image_url ? (
                <Image source={{ uri: detailProduct.image_url }} style={s.detailHeroImage} />
              ) : (
                <View style={s.detailHeroPlaceholder}>
                  <MaterialIcons name="fastfood" size={32} color={ACCENT} />
                </View>
              )}

              <View style={s.detailHeroInfo}>
                <Text style={s.detailHeroName} numberOfLines={2}>
                  {detailProduct?.product_name}
                </Text>
                <View style={s.detailTenantPill}>
                  <MaterialIcons name="store" size={11} color={ACCENT} />
                  <Text style={s.detailTenantPillText}>
                    {detailProduct?.tenants?.tenant_name ?? 'Produk Sendiri'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={s.closeBtn} onPress={closeDetail}>
                <MaterialIcons name="close" size={18} color={TEXT_SECOND} />
              </TouchableOpacity>
            </View>

            <View style={s.priceBanner}>
              <View style={s.priceCol}>
                <Text style={s.priceLabel}>Harga Beli</Text>
                <Text style={s.priceValueMuted}>
                  Rp {(detailProduct?.purchase_price ?? 0).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={s.priceDivider} />
              <View style={s.priceCol}>
                <Text style={s.priceLabel}>Harga Jual</Text>
                <Text style={s.priceValueAccent}>
                  Rp {(detailProduct?.selling_price ?? 0).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {detailProduct && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={s.infoGrid}>
                  <InfoTile
                    icon="category"
                    label="Kategori"
                    value={detailProduct.category || '—'}
                  />
                  <InfoTile
                    icon="straighten"
                    label="Unit"
                    value={detailProduct.unit || '—'}
                  />
                </View>

                {detailProduct.description ? (
                  <View style={s.descBox}>
                    <Text style={s.descLabel}>Deskripsi</Text>
                    <Text style={s.descText}>{detailProduct.description}</Text>
                  </View>
                ) : null}

                <View style={s.sectionDivider} />

                <View style={s.detailActions}>
                  <TouchableOpacity
                    style={s.actionBtnSecondary}
                    onPress={() => { closeDetail(); if (detailProduct && role === 'owner') openEdit(detailProduct); }}
                    activeOpacity={0.8}
                    disabled={role !== 'owner'}
                  >
                    <MaterialIcons name="edit" size={16} color={TEXT_SECOND} />
                    <Text style={s.actionBtnSecondaryText}>
                      {role === 'owner' ? 'Edit Produk' : 'Hanya Owner yang bisa edit'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.actionBtnDanger}
                    onPress={() => { if (detailProduct) handleDelete(detailProduct); closeDetail(); }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                    <Text style={s.actionBtnDangerText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={closeModal}>
            <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />

              <View style={s.modalHeader}>
                <View style={s.modalHeaderIcon}>
                  <MaterialIcons
                    name={isEditMode ? 'edit' : 'add-box'}
                    size={18}
                    color={ACCENT}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>
                    {isEditMode ? 'Edit Produk' : 'Produk Baru'}
                  </Text>
                  <Text style={s.modalSubtitle}>
                    {isEditMode ? editTarget?.product_name : 'Lengkapi informasi produk'}
                  </Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={closeModal} disabled={saving}>
                  <MaterialIcons name="close" size={18} color={TEXT_SECOND} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={s.imageRowSection}>
                  <TouchableOpacity style={s.imagePickerBox} onPress={pickImage} activeOpacity={0.8}>
                    {previewImage ? (
                      <Image source={{ uri: previewImage }} style={s.imagePickerPreview} />
                    ) : (
                      <View style={s.imagePickerInner}>
                        <View style={s.imagePickerIconCircle}>
                          <MaterialIcons name="add-a-photo" size={20} color={ACCENT} />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={s.imagePickerMeta}>
                    <Text style={s.imagePickerTitle}>Foto Produk</Text>
                    <Text style={s.imagePickerHint}>Format JPG / PNG · maks 2MB</Text>
                    <View style={s.imagePickerBtns}>
                      <TouchableOpacity style={s.imageActionBtn} onPress={pickImage}>
                        <Text style={s.imageActionBtnText}>
                          {previewImage ? 'Ganti Foto' : 'Pilih Foto'}
                        </Text>
                      </TouchableOpacity>
                      {previewImage && (
                        <TouchableOpacity
                          style={[s.imageActionBtn, s.imageActionBtnDanger]}
                          onPress={() => { setImageUri(null); setExistingImageUrl(null); }}
                        >
                          <Text style={[s.imageActionBtnText, { color: '#DC2626' }]}>Hapus</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                <SectionLabel label="Informasi Dasar" />

                <FormField label="Nama Produk" required>
                  <TextInput
                    style={s.input}
                    placeholder="Contoh: Kopi Susu"
                    placeholderTextColor={TEXT_LIGHT}
                    value={form.product_name}
                    onChangeText={(v) => setForm({ ...form, product_name: v })}
                  />
                </FormField>

                <FormField label="Deskripsi">
                  <TextInput
                    style={[s.input, s.inputMultiline]}
                    placeholder="Deskripsi singkat produk (opsional)"
                    placeholderTextColor={TEXT_LIGHT}
                    multiline
                    value={form.description}
                    onChangeText={(v) => setForm({ ...form, description: v })}
                  />
                </FormField>

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Kategori">
                      <TextInput
                        style={s.input}
                        placeholder="Minuman"
                        placeholderTextColor={TEXT_LIGHT}
                        value={form.category}
                        onChangeText={(v) => setForm({ ...form, category: v })}
                      />
                    </FormField>
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="Unit">
                      <TextInput
                        style={s.input}
                        placeholder="Gelas"
                        placeholderTextColor={TEXT_LIGHT}
                        value={form.unit}
                        onChangeText={(v) => setForm({ ...form, unit: v })}
                      />
                    </FormField>
                  </View>
                </View>

                <SectionLabel label="Harga" />

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Harga Beli">
                      <View style={s.currencyInput}>
                        <Text style={s.currencyPrefix}>Rp</Text>
                        <TextInput
                          style={s.currencyTextInput}
                          placeholder="0"
                          placeholderTextColor={TEXT_LIGHT}
                          keyboardType="numeric"
                          value={form.purchase_price}
                          onChangeText={(v) => setForm({ ...form, purchase_price: v })}
                        />
                      </View>
                    </FormField>
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="Harga Jual" required>
                      <View style={[s.currencyInput, s.currencyInputAccent]}>
                        <Text style={[s.currencyPrefix, { color: ACCENT }]}>Rp</Text>
                        <TextInput
                          style={s.currencyTextInput}
                          placeholder="0"
                          placeholderTextColor={TEXT_LIGHT}
                          keyboardType="numeric"
                          value={form.selling_price}
                          onChangeText={(v) => setForm({ ...form, selling_price: v })}
                        />
                      </View>
                    </FormField>
                  </View>
                </View>

                <SectionLabel label="Tenant Provider" />

                <FormField label="Pilih Tenant">
                  <View style={s.pickerWrap}>
                    <MaterialIcons name="store" size={16} color={TEXT_LIGHT} style={{ marginLeft: 12 }} />
                    <Picker
                      selectedValue={form.tenant_id}
                      onValueChange={(v) => setForm({ ...form, tenant_id: v ? Number(v) : null })}
                      style={s.pickerStyle}
                    >
                      <Picker.Item label="— Produk Sendiri —" value={null} />
                      {tenants.map((t) => (
                        <Picker.Item key={t.tenant_id} label={t.tenant_name} value={t.tenant_id} />
                      ))}
                    </Picker>
                  </View>
                </FormField>

                <TouchableOpacity
                  style={[s.saveBtn, (saving || uploading) && { opacity: 0.65 }]}
                  onPress={handleSave}
                  disabled={saving || uploading}
                  activeOpacity={0.85}
                >
                  {saving || uploading ? (
                    <ActivityIndicator size={18} color="#fff" />
                  ) : (
                    <MaterialIcons name={isEditMode ? 'save' : 'check-circle'} size={18} color="#fff" />
                  )}
                  <Text style={s.saveBtnText}>
                    {uploading
                      ? 'Mengunggah Gambar...'
                      : saving
                      ? 'Menyimpan...'
                      : isEditMode
                      ? 'Simpan Perubahan'
                      : 'Tambah Produk'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={sl.wrap}>
      <Text style={sl.text}>{label}</Text>
      <View style={sl.line} />
    </View>
  );
}

const sl = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 4 },
  text: { fontSize: 11, fontWeight: '700', color: TEXT_LIGHT, letterSpacing: 1, textTransform: 'uppercase' },
  line: { flex: 1, height: 1, backgroundColor: BORDER },
});

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={ff.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 7 }}>
        <Text style={ff.label}>{label}</Text>
        {required && <Text style={ff.required}>*</Text>}
      </View>
      {children}
    </View>
  );
}

const ff = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  label:    { fontSize: 13, fontWeight: '600', color: TEXT_SECOND },
  required: { fontSize: 13, fontWeight: '700', color: ACCENT },
});

function InfoTile({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={it.tile}>
      <View style={it.iconWrap}>
        <MaterialIcons name={icon} size={14} color={ACCENT} />
      </View>
      <Text style={it.label}>{label}</Text>
      <Text style={it.value}>{value}</Text>
    </View>
  );
}

const it = StyleSheet.create({
  tile: {
    flex: 1, backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 14, gap: 4,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: ACCENT_SOFT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  label: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600', letterSpacing: 0.3 },
  value: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: PADDING, paddingTop: 8, paddingBottom: 12,
  },
  heading:    { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  subheading: { fontSize: 12, color: TEXT_LIGHT, marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: SURFACE,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER,
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE,
    marginHorizontal: PADDING, marginBottom: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER, height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: TEXT_PRIMARY },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 12,
  },
  badgeRow: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start',
  },
  dot:       { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  cardImageWrap: {
    width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: 6, marginTop: 6,
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: ACCENT_SOFT, alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 12, fontWeight: '700', color: TEXT_PRIMARY, marginTop: 4 },
  tenantLabel: { fontSize: 10, color: TEXT_LIGHT },
  price:       { fontSize: 20, fontWeight: '800', color: ACCENT, marginTop: 2 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyText: { fontSize: 13, color: TEXT_LIGHT, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', elevation: 5,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    maxHeight: '93%',
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2,
    alignSelf: 'center', marginBottom: 18,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },

  detailHeaderStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16,
  },
  detailHeroImage: {
    width: 64, height: 64, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  detailHeroPlaceholder: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: ACCENT_SOFT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: ACCENT_MED + '40',
  },
  detailHeroInfo:       { flex: 1, gap: 6 },
  detailHeroName:       { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY, lineHeight: 22 },
  detailTenantPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ACCENT_SOFT, alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  detailTenantPillText: { fontSize: 11, fontWeight: '600', color: ACCENT },

  priceBanner: {
    flexDirection: 'row', backgroundColor: '#FAFAFA',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 18, overflow: 'hidden',
  },
  priceCol:        { flex: 1, paddingVertical: 14, paddingHorizontal: 16 },
  priceDivider:    { width: 1, backgroundColor: BORDER },
  priceLabel:      { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600', marginBottom: 4 },
  priceValueMuted: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  priceValueAccent:{ fontSize: 15, fontWeight: '800', color: ACCENT },

  infoGrid:  { flexDirection: 'row', gap: 10, marginBottom: 14 },

  descBox: {
    backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 14,
  },
  descLabel: { fontSize: 11, fontWeight: '700', color: TEXT_LIGHT, letterSpacing: 0.5, marginBottom: 6 },
  descText:  { fontSize: 14, color: TEXT_PRIMARY, lineHeight: 20 },

  sectionDivider: { height: 1, backgroundColor: BORDER, marginBottom: 16 },

  detailActions: { flexDirection: 'row', gap: 10 },
  actionBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: TEXT_SECOND },
  actionBtnDanger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  actionBtnDangerText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  modalHeaderIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: ACCENT_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  modalSubtitle: { fontSize: 12, color: TEXT_LIGHT, marginTop: 2 },

  imageRowSection: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FAFAFA', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 22,
  },
  imagePickerBox: {
    width: 72, height: 72, borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePickerPreview: { width: '100%', height: '100%' },
  imagePickerInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT_SOFT,
  },
  imagePickerIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  imagePickerMeta:  { flex: 1, gap: 3 },
  imagePickerTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  imagePickerHint:  { fontSize: 11, color: TEXT_LIGHT },
  imagePickerBtns:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  imageActionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  imageActionBtnDanger: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  imageActionBtnText: { fontSize: 12, fontWeight: '600', color: TEXT_SECOND },

  input: {
    backgroundColor: '#FAFAFA', borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT_PRIMARY,
  },
  inputMultiline: { height: 76, textAlignVertical: 'top', paddingTop: 12 },

  row2: { flexDirection: 'row', gap: 10 },

  currencyInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    overflow: 'hidden',
  },
  currencyInputAccent: { borderColor: ACCENT_MED + '80', backgroundColor: ACCENT_SOFT + '60' },
  currencyPrefix: {
    paddingHorizontal: 12, fontSize: 13, fontWeight: '700',
    color: TEXT_SECOND, borderRightWidth: 1, borderRightColor: BORDER,
    paddingVertical: 12,
  },
  currencyTextInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 14, color: TEXT_PRIMARY,
  },

  pickerWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, overflow: 'hidden',
  },
  pickerStyle: { flex: 1, color: TEXT_PRIMARY, height: 50 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 16, marginTop: 10,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});

