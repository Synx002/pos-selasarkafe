// components/TransactionDetailView.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const ACCENT = '#E597A0';
const ACCENT_LIGHT = '#FDF2F4';

interface Props {
  transactionId: string;
  onBack: () => void;
  role?: 'cashier' | 'owner' | 'storeman';
}

export default function TransactionDetailView({ transactionId, onBack, role = 'cashier' }: Props) {
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (transactionId) fetchTransaction();
  }, [transactionId]);

  const fetchTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, transaction_details(*, products(*)), payments(*), profiles(user_name)`)
        .eq('transaction_id', transactionId)
        .single();
      if (error) throw error;
      setTransaction(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat detail transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!transaction) return;
    setPrinting(true);
    try {
      const payment = transaction.payments?.[0];
      const total = (transaction.grand_total ?? (transaction.subtotal + transaction.tax - (transaction.discount || 0)));
      const dateStr = format(new Date(transaction.created_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale });

      const itemRows = transaction.transaction_details?.map((item: any) => `
        <tr>
          <td>${item.products?.product_name ?? '-'}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">Rp ${item.unit_price?.toLocaleString('id-ID')}</td>
          <td style="text-align:right">Rp ${(item.quantity * item.unit_price).toLocaleString('id-ID')}</td>
        </tr>`).join('') ?? '';

      const cashSection = payment?.payment_method === 'cash' ? `
        <div class="cash-row"><span>Tunai</span><span>Rp ${payment.amount_paid?.toLocaleString('id-ID')}</span></div>
        <div class="cash-row green"><span>Kembalian</span><span>Rp ${payment.change_amount?.toLocaleString('id-ID')}</span></div>` : '';

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#fff; display:flex; justify-content:center; padding:32px 16px; }
          .receipt { width:100%; max-width:360px; }
          .header { text-align:center; padding-bottom:20px; border-bottom:2px dashed #F0F0F0; margin-bottom:20px; }
          .cafe-name { font-size:20px; font-weight:800; color:#111827; letter-spacing:-0.3px; }
          .cafe-addr { font-size:11px; color:#9CA3AF; margin-top:4px; }
          .date      { font-size:10px; color:#C4C9D4; margin-top:6px; }
          .meta { display:flex; justify-content:space-between; background:#FAFAFA; border-radius:12px; padding:12px 14px; margin-bottom:20px; gap:8px; }
          .meta-item { text-align:center; flex:1; }
          .meta-label { font-size:9px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.7px; font-weight:600; }
          .meta-value { font-size:12px; font-weight:700; color:#111827; margin-top:3px; }
          .meta-divider { width:1px; background:#EEEEEE; }
          table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
          th { text-align:left; font-size:9px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; padding-bottom:8px; border-bottom:1px solid #F5F5F5; }
          td { padding:8px 0; border-bottom:1px solid #F9F9F9; color:#374151; vertical-align:top; }
          .total-row { display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:2px solid #F5F5F5; }
          .total-label { font-size:14px; font-weight:800; color:#111827; }
          .total-value { font-size:18px; font-weight:800; color:#E597A0; }
          .footer { text-align:center; padding-top:16px; border-top:2px dashed #F0F0F0; font-size:11px; color:#9CA3AF; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="cafe-name">Selasar Kafe</div>
            <div class="cafe-addr">Jl. Raya No. 123, Bandung</div>
            <div class="date">${dateStr}</div>
          </div>
          <div class="meta">
            <div class="meta-item"><div class="meta-label">ID</div><div class="meta-value">#${transaction.transaction_id.toString().slice(-6)}</div></div>
            <div class="meta-divider"></div>
            <div class="meta-item"><div class="meta-label">Metode</div><div class="meta-value">${(payment?.payment_method ?? '-').toUpperCase()}</div></div>
            <div class="meta-divider"></div>
            <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value" style="color:#10B981">${transaction.transaction_status?.toUpperCase()}</div></div>
          </div>
          <table>
            <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="total-row"><span class="total-label">Grand Total</span><span class="total-value">Rp ${total.toLocaleString('id-ID')}</span></div>
          <div class="footer">Terima kasih telah berkunjung ke Selasar Kafe</div>
        </div>
      </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Cetak Detail Transaksi' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Gagal mencetak struk. Coba lagi.');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={s.loadingText}>Memuat detail...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={s.center}>
        <MaterialIcons name="error-outline" size={48} color="#D1D5DB" />
        <Text style={s.notFoundText}>Detail tidak ditemukan</Text>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const payment = transaction.payments?.[0];
  const total = (transaction.grand_total ?? (transaction.subtotal + transaction.tax - (transaction.discount || 0)));
  const dateStr = format(new Date(transaction.created_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backIcon}>
          <MaterialIcons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={s.title}>Detail Transaksi</Text>
        <TouchableOpacity onPress={handlePrint} disabled={printing} style={s.printIcon}>
          {printing ? <ActivityIndicator size={20} color={ACCENT} /> : <MaterialIcons name="print" size={24} color={ACCENT} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.card}>
          <View style={s.statusSection}>
            <View style={[s.statusBadge, { backgroundColor: transaction.transaction_status === 'completed' ? '#ECFDF5' : '#FEF2F2' }]}>
              <Text style={[s.statusText, { color: transaction.transaction_status === 'completed' ? '#059669' : '#DC2626' }]}>
                {transaction.transaction_status?.toUpperCase()}
              </Text>
            </View>
            <Text style={s.orderId}>#{transaction.transaction_id.toString().slice(-6).toUpperCase()}</Text>
            <Text style={s.dateText}>{dateStr}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>KASIR</Text>
              <Text style={s.infoValue}>{transaction.profiles?.user_name || 'Admin'}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>METODE</Text>
              <Text style={s.infoValue}>{(payment?.payment_method ?? '-').toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>Produk Pesanan</Text>
          {transaction.transaction_details?.map((item: any, idx: number) => (
            <View key={idx} style={s.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.productName}>{item.products?.product_name ?? '-'}</Text>
                <Text style={s.productQty}>{item.quantity} × Rp {item.unit_price?.toLocaleString('id-ID')}</Text>
              </View>
              <Text style={s.productPrice}>Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}</Text>
            </View>
          ))}

          <View style={s.divider} />

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>Rp {transaction.subtotal?.toLocaleString('id-ID')}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Pajak (11%)</Text>
            <Text style={s.summaryValue}>Rp {transaction.tax?.toLocaleString('id-ID')}</Text>
          </View>
          {transaction.discount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Diskon</Text>
              <Text style={[s.summaryValue, { color: ACCENT }]}>- Rp {transaction.discount?.toLocaleString('id-ID')}</Text>
            </View>
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Pembayaran</Text>
            <Text style={s.totalValue}>Rp {total.toLocaleString('id-ID')}</Text>
          </View>

          {payment?.payment_method === 'cash' && (
            <View style={s.cashBox}>
              <View style={s.cashRow}>
                <Text style={s.cashLabel}>Bayar Tunai</Text>
                <Text style={s.cashValue}>Rp {payment.amount_paid?.toLocaleString('id-ID')}</Text>
              </View>
              <View style={s.cashRow}>
                <Text style={s.cashLabel}>Kembalian</Text>
                <Text style={[s.cashValue, { color: '#059669', fontWeight: '700' }]}>Rp {payment.change_amount?.toLocaleString('id-ID')}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  notFoundText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  backBtn: { backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backIcon: { width: 40, height: 40, justifyContent: 'center' },
  printIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },

  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#F0F0F0',
  },

  statusSection: { alignItems: 'center', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginBottom: 12 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  orderId: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#9CA3AF' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },

  infoGrid: { flexDirection: 'row' },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#374151' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 16 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  productName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  productQty: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '600', color: '#111' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#111', fontWeight: '500' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  totalValue: { fontSize: 20, fontWeight: '800', color: ACCENT },

  cashBox: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginTop: 20 },
  cashRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cashLabel: { fontSize: 13, color: '#374151' },
  cashValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
