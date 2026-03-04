// app/owner/settings/index.tsx — Owner: Pengaturan
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ACCENT = '#E597A0';

type SettingItem = {
  label: string;
  description: string;
  icon: string;
  color: string;
  onPress?: () => void;
};

export default function OwnerSettingsScreen() {

  const settingsGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Toko',
      items: [
        {
          label: 'Informasi Toko',
          description: 'Ubah nama, alamat dan kontak toko',
          icon: 'store',
          color: ACCENT,
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
        {
          label: 'Pajak & Biaya',
          description: 'Atur persentase pajak dan biaya layanan',
          icon: 'receipt-long',
          color: '#f57c00',
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
        {
          label: 'Metode Pembayaran',
          description: 'Kelola metode pembayaran yang diterima',
          icon: 'payment',
          color: '#4caf50',
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
      ],
    },
    {
      title: 'Cetak',
      items: [
        {
          label: 'Printer Struk',
          description: 'Hubungkan printer thermal',
          icon: 'print',
          color: '#7b1fa2',
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
        {
          label: 'Template Struk',
          description: 'Atur tampilan struk/faktur',
          icon: 'description',
          color: '#00838f',
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        {
          label: 'Backup Data',
          description: 'Cadangkan data transaksi',
          icon: 'backup',
          color: '#37474f',
          onPress: () => Alert.alert('Info', 'Fitur segera hadir'),
        },
        {
          label: 'Tentang Aplikasi',
          description: 'Versi 1.0.0 • Selasa Kafe POS',
          icon: 'info',
          color: '#9e9e9e',
          onPress: () => Alert.alert('Selasa Kafe POS', 'Versi 1.0.0\n© 2026 Selasa Kafe'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={s.container}>
      <Text style={s.heading}>Pengaturan</Text>

      {settingsGroups.map((group) => (
        <View key={group.title} style={s.group}>
          <Text style={s.groupTitle}>{group.title}</Text>
          {group.items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={s.row}
              onPress={item.onPress}
              activeOpacity={0.7}>
              <View style={[s.icon, { backgroundColor: item.color + '18' }]}>
                <MaterialIcons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{item.label}</Text>
                <Text style={s.desc}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb', padding: 20 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 6, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  desc: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
});
