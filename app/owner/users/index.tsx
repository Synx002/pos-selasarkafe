// app/owner/users/index.tsx — Owner: Manajemen Pengguna
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

const ACCENT = '#E597A0';
const ACCENT_LIGHT = '#FDF2F4';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  owner:    { label: 'Pemilik',          color: '#7C3AED', bg: '#F5F3FF', icon: 'verified-user' },
  cashier:  { label: 'Kasir',            color: '#0284C7', bg: '#F0F9FF', icon: 'point-of-sale' },
  storeman: { label: 'Pengelola Toko',   color: '#059669', bg: '#ECFDF5', icon: 'storefront'    },
};

interface UserProfile {
  id: string;
  user_name: string;
  full_name?: string;
  email?: string;
  role: string;
  created_at?: string;
}

export default function OwnerUsersScreen() {
  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible]   = useState(false);
  const [editUser, setEditUser]         = useState<UserProfile | null>(null);
  const [editName, setEditName]         = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole]         = useState('');
  const [saving, setSaving]             = useState(false);

  // Filter
  const [filterRole, setFilterRole] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('user_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  // ── Open Edit Modal ──────────────────────────────────────────────────────
  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditName(user.user_name || '');
    setEditFullName(user.full_name || '');
    setEditRole(user.role || 'cashier');
    setEditVisible(true);
  };

  // ── Save Edit ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editUser) return;
    if (!editName.trim()) {
      Alert.alert('Validasi', 'Username tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          user_name: editName.trim(),
          full_name: editFullName.trim(),
          role: editRole,
        })
        .eq('id', editUser.id);

      if (error) throw error;
      setEditVisible(false);
      fetchUsers();
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete User ──────────────────────────────────────────────────────────
  const handleDelete = (user: UserProfile) => {
    Alert.alert(
      'Hapus Pengguna',
      `Yakin ingin menghapus akun "${user.user_name}"? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);
              if (error) throw error;
              fetchUsers();
            } catch (e: any) {
              Alert.alert('Gagal', e.message || 'Gagal menghapus pengguna.');
            }
          },
        },
      ]
    );
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  // ── Render Item ──────────────────────────────────────────────────────────
  const renderUser = ({ item }: { item: UserProfile }) => {
    const cfg = ROLE_CONFIG[item.role] || { label: item.role, color: '#6B7280', bg: '#F9FAFB', icon: 'person' };
    const initials = (item.user_name?.[0] || '?').toUpperCase();

    return (
      <Surface style={s.card}>
        {/* Avatar */}
        <View style={[s.avatar, { backgroundColor: cfg.bg }]}>
          <Text style={[s.avatarText, { color: cfg.color }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={s.userName} numberOfLines={1}>{item.user_name || 'Tanpa Nama'}</Text>
          {item.full_name ? (
            <Text style={s.fullName} numberOfLines={1}>{item.full_name}</Text>
          ) : null}
          <Text style={s.email} numberOfLines={1}>{item.email || '-'}</Text>
        </View>

        {/* Role badge */}
        <View style={[s.roleBadge, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[s.roleText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(item)}>
            <MaterialIcons name="edit" size={18} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleDelete(item)}>
            <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        refreshing={refreshing}
        onRefresh={fetchUsers}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.headerRow}>
              <View>
                <Text style={s.headerSub}>Owner</Text>
                <Text style={s.heading}>Manajemen Pengguna</Text>
              </View>
              <View style={s.totalBadge}>
                <Text style={s.totalBadgeText}>{users.length} Akun</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                <Surface key={role} style={s.statCard}>
                  <View style={[s.statIcon, { backgroundColor: cfg.bg }]}>
                    <MaterialIcons name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>
                  <Text style={s.statCount}>{roleCounts[role] || 0}</Text>
                  <Text style={s.statLabel}>{cfg.label}</Text>
                </Surface>
              ))}
            </View>

            {/* Filter chips */}
            <View style={s.filterRow}>
              {[
                { key: 'all', label: 'Semua' },
                ...Object.entries(ROLE_CONFIG).map(([k, v]) => ({ key: k, label: v.label })),
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterChip, filterRole === f.key && s.filterChipActive]}
                  onPress={() => setFilterRole(f.key)}
                >
                  <Text style={[s.filterText, filterRole === f.key && s.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.listLabel}>
              {filtered.length} pengguna{filterRole !== 'all' ? ` · ${ROLE_CONFIG[filterRole]?.label}` : ''}
            </Text>
          </View>
        }
        renderItem={renderUser}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialIcons name="group-off" size={48} color="#D1D5DB" />
            <Text style={s.emptyText}>Tidak ada pengguna ditemukan</Text>
          </View>
        }
      />

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={editVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={s.overlay} onPress={() => setEditVisible(false)}>
            <Pressable style={s.sheet}>
              {/* Handle */}
              <View style={s.sheetHandle} />

              {/* Title */}
              <View style={s.sheetHeader}>
                <View>
                  <Text style={s.sheetTitle}>Edit Pengguna</Text>
                  <Text style={s.sheetSub}>{editUser?.email || '-'}</Text>
                </View>
                <TouchableOpacity onPress={() => setEditVisible(false)} style={s.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Username */}
              <Text style={s.fieldLabel}>Username</Text>
              <View style={s.inputWrapper}>
                <MaterialIcons name="person-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Username"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="none"
                />
              </View>

              {/* Full Name */}
              <Text style={s.fieldLabel}>Nama Lengkap</Text>
              <View style={s.inputWrapper}>
                <MaterialIcons name="badge" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.input}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Nama lengkap (opsional)"
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              {/* Role selector */}
              <Text style={s.fieldLabel}>Role</Text>
              <View style={s.roleGrid}>
                {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
                  const active = editRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        s.roleOption,
                        { borderColor: active ? cfg.color : '#E5E7EB' },
                        active && { backgroundColor: cfg.bg },
                      ]}
                      onPress={() => setEditRole(role)}
                    >
                      <View style={[s.roleOptionIcon, { backgroundColor: active ? cfg.color + '20' : '#F3F4F6' }]}>
                        <MaterialIcons name={cfg.icon as any} size={20} color={active ? cfg.color : '#9CA3AF'} />
                      </View>
                      <Text style={[s.roleOptionText, active && { color: cfg.color, fontWeight: '700' }]}>
                        {cfg.label}
                      </Text>
                      {active && (
                        <View style={[s.roleCheck, { backgroundColor: cfg.color }]}>
                          <MaterialIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <MaterialIcons name="check" size={18} color="#fff" />
                )}
                <Text style={s.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: 16, paddingBottom: 16,
  },
  headerSub: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 2 },
  totalBadge: { backgroundColor: ACCENT_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  totalBadgeText: { fontSize: 12, fontWeight: '700', color: ACCENT },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, elevation: 0, borderRadius: 16, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#F0F0F0', padding: 12, alignItems: 'center',
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statCount: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textAlign: 'center', marginTop: 2 },

  // Filter
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  listLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 0, borderRadius: 18, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#F0F0F0', padding: 14,
  },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 19, fontWeight: '800' },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  fullName: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  email: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, flexShrink: 0,
  },
  roleText: { fontSize: 10.5, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  actionBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },

  // Modal / Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sheetSub: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },

  // Form
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  input: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },

  // Role grid
  roleGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleOption: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA', padding: 12, alignItems: 'center', gap: 6,
  },
  roleOptionIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  roleOptionText: { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },

  // Save btn
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 15,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});