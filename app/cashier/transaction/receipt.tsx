// app/cashier/receipt/[id].tsx
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const ACCENT = '#E597A0';
const ACCENT_LIGHT = '#FDF2F4';

export default function ReceiptScreen() {
  const { id: transactionId } = useLocalSearchParams();
  const router = useRouter();
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
        .select(`*, transaction_details(*, products(*)), payments(*)`)
        .eq('transaction_id', transactionId)
        .single();
      if (error) throw error;
      setTransaction(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Print / Export PDF ──────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!transaction) return;
    setPrinting(true);
    try {
      const payment = transaction.payments?.[0];
      const total   = transaction.subtotal + transaction.tax - (transaction.discount || 0);
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
          .check { width:52px; height:52px; border-radius:50%; background:#ECFDF5; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; }
          .check svg { width:28px; height:28px; }
          .cafe-name { font-size:20px; font-weight:800; color:#111827; letter-spacing:-0.3px; }
          .cafe-addr { font-size:11px; color:#9CA3AF; margin-top:4px; }
          .date      { font-size:10px; color:#C4C9D4; margin-top:6px; }

          .meta { display:flex; justify-content:space-between; background:#FAFAFA; border-radius:12px; padding:12px 14px; margin-bottom:20px; gap:8px; }
          .meta-item { text-align:center; flex:1; }
          .meta-label { font-size:9px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.7px; font-weight:600; }
          .meta-value { font-size:12px; font-weight:700; color:#111827; margin-top:3px; }
          .meta-divider { width:1px; background:#EEEEEE; }

          .items-title { font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:10px; }
          table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
          th { text-align:left; font-size:9px; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; padding-bottom:8px; border-bottom:1px solid #F5F5F5; }
          td { padding:8px 0; border-bottom:1px solid #F9F9F9; color:#374151; vertical-align:top; }
          tr:last-child td { border-bottom:none; }

          .summary { border-top:2px dashed #F0F0F0; padding-top:16px; margin-bottom:16px; }
          .sum-row { display:flex; justify-content:space-between; margin-bottom:6px; }
          .sum-label { font-size:12px; color:#9CA3AF; }
          .sum-value { font-size:12px; color:#374151; font-weight:500; }
          .total-row { display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:2px solid #F5F5F5; }
          .total-label { font-size:14px; font-weight:800; color:#111827; }
          .total-value { font-size:18px; font-weight:800; color:#E597A0; }

          .cash-section { background:#F0FDF4; border-radius:12px; padding:12px 14px; margin-bottom:20px; }
          .cash-row { display:flex; justify-content:space-between; font-size:12px; color:#374151; margin-bottom:4px; }
          .cash-row:last-child { margin-bottom:0; }
          .cash-row.green span:last-child { color:#16A34A; font-weight:700; }

          .footer { text-align:center; padding-top:16px; border-top:2px dashed #F0F0F0; }
          .footer-text { font-size:11px; color:#9CA3AF; font-style:italic; }
          .footer-thanks { font-size:13px; font-weight:700; color:#111827; margin-bottom:4px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="check">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="cafe-name">Selasar Kafe</div>
            <div class="cafe-addr">Jl. Raya No. 123, Bandung</div>
            <div class="date">${dateStr}</div>
          </div>

          <div class="meta">
            <div class="meta-item">
              <div class="meta-label">No. Struk</div>
              <div class="meta-value">#${transaction.transaction_id.toString().slice(-6)}</div>
            </div>
            <div class="meta-divider"></div>
            <div class="meta-item">
              <div class="meta-label">Pembayaran</div>
              <div class="meta-value">${(payment?.payment_method ?? '-').toUpperCase()}</div>
            </div>
            <div class="meta-divider"></div>
            <div class="meta-item">
              <div class="meta-label">Status</div>
              <div class="meta-value" style="color:#10B981">LUNAS</div>
            </div>
          </div>

          <div class="items-title">Pesanan</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Harga</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div class="summary">
            <div class="sum-row"><span class="sum-label">Subtotal</span><span class="sum-value">Rp ${transaction.subtotal?.toLocaleString('id-ID')}</span></div>
            <div class="sum-row"><span class="sum-label">Pajak (11%)</span><span class="sum-value">Rp ${transaction.tax?.toLocaleString('id-ID')}</span></div>
            ${transaction.discount ? `<div class="sum-row"><span class="sum-label">Diskon</span><span class="sum-value" style="color:#E597A0">- Rp ${transaction.discount?.toLocaleString('id-ID')}</span></div>` : ''}
            <div class="total-row">
              <span class="total-label">Total</span>
              <span class="total-value">Rp ${total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          ${payment?.payment_method === 'cash' ? `<div class="cash-section">${cashSection}</div>` : ''}

          <div class="footer">
            <div class="footer-thanks">Terima kasih! 🌸</div>
            <div class="footer-text">Sampai jumpa di kunjungan berikutnya</div>
          </div>
        </div>
      </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Cetak / Simpan Struk' });
      } else {
        // Fallback: open print dialog directly
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Gagal mencetak struk. Coba lagi.');
    } finally {
      setPrinting(false);
    }
  };

  // ── Loading / Not Found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <View style={s.loadingIcon}>
          <MaterialIcons name="receipt-long" size={28} color={ACCENT} />
        </View>
        <Text style={s.loadingText}>Memuat struk...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={s.center}>
        <MaterialIcons name="error-outline" size={48} color="#D1D5DB" />
        <Text style={s.notFoundText}>Struk tidak ditemukan</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/cashier/transaction')}>
          <Text style={s.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const payment = transaction.payments?.[0];
  const total   = transaction.subtotal + transaction.tax - (transaction.discount || 0);
  const dateStr = format(new Date(transaction.created_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale });

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Receipt Card ── */}
        <View style={s.card}>

          {/* Header */}
          <View style={s.receiptHeader}>
            <View style={s.checkCircle}>
              <MaterialIcons name="check" size={28} color="#10B981" />
            </View>
            <Text style={s.cafeName}>Selasar Kafe</Text>
            <Text style={s.cafeAddr}>Jl. Raya No. 123, Bandung</Text>
            <Text style={s.dateText}>{dateStr}</Text>
          </View>

          {/* Meta row */}
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>No. Struk</Text>
              <Text style={s.metaValue}>#{transaction.transaction_id.toString().slice(-6)}</Text>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Pembayaran</Text>
              <Text style={s.metaValue}>{(payment?.payment_method ?? '-').toUpperCase()}</Text>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Status</Text>
              <Text style={[s.metaValue, { color: '#10B981' }]}>LUNAS</Text>
            </View>
          </View>

          {/* Dashed separator */}
          <View style={s.dashed} />

          {/* Items */}
          <Text style={s.sectionLabel}>Pesanan</Text>
          {transaction.transaction_details?.map((item: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.itemName} numberOfLines={2}>{item.products?.product_name ?? '-'}</Text>
                <Text style={s.itemQty}>{item.quantity} × Rp {item.unit_price?.toLocaleString('id-ID')}</Text>
              </View>
              <Text style={s.itemTotal}>Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}</Text>
            </View>
          ))}

          {/* Dashed separator */}
          <View style={s.dashed} />

          {/* Summary */}
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>Rp {transaction.subtotal?.toLocaleString('id-ID')}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Pajak (11%)</Text>
            <Text style={s.summaryValue}>Rp {transaction.tax?.toLocaleString('id-ID')}</Text>
          </View>
          {transaction.discount ? (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Diskon</Text>
              <Text style={[s.summaryValue, { color: ACCENT }]}>- Rp {transaction.discount?.toLocaleString('id-ID')}</Text>
            </View>
          ) : null}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>Rp {total.toLocaleString('id-ID')}</Text>
          </View>

          {/* Cash section */}
          {payment?.payment_method === 'cash' && (
            <View style={s.cashSection}>
              <View style={s.cashRow}>
                <Text style={s.cashLabel}>Bayar Tunai</Text>
                <Text style={s.cashValue}>Rp {payment.amount_paid?.toLocaleString('id-ID')}</Text>
              </View>
              <View style={s.cashRow}>
                <Text style={s.cashLabel}>Kembalian</Text>
                <Text style={[s.cashValue, { color: '#16A34A', fontWeight: '700' }]}>
                  Rp {payment.change_amount?.toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={s.dashed} />
          <View style={s.receiptFooter}>
            <Text style={s.footerThanks}>Terima kasih!</Text>
            <Text style={s.footerSub}>Sampai jumpa di kunjungan berikutnya</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Action Buttons ── */}
      <View style={s.actions}>
        {/* Print */}
        <TouchableOpacity
          style={[s.printBtn, printing && { opacity: 0.7 }]}
          onPress={handlePrint}
          disabled={printing}
          activeOpacity={0.85}
        >
          {printing
            ? <MaterialIcons name="hourglass-top" size={20} color={ACCENT} />
            : <MaterialIcons name="print" size={20} color={ACCENT} />
          }
          <Text style={s.printBtnText}>{printing ? 'Mencetak...' : 'Cetak Struk'}</Text>
        </TouchableOpacity>

        {/* New transaction */}
        {/* <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.replace('/cashier/transaction')}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={s.newBtnText}>Transaksi Baru</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FB', gap: 12 },
  loadingIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#FDF2F4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  loadingText:  { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  notFoundText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  backBtn:      { backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  backBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },

  // Receipt card
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: '#F0F0F0', padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },

  // Header
  receiptHeader: { alignItems: 'center', paddingBottom: 20, marginBottom: 16 },
  checkCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  cafeName: { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  cafeAddr: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  dateText:  { fontSize: 10, color: '#C4C9D4', marginTop: 5 },

  // Meta row
  metaRow: {
    flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8, marginBottom: 20,
  },
  metaItem:    { flex: 1, alignItems: 'center' },
  metaLabel:   { fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  metaValue:   { fontSize: 12, fontWeight: '800', color: '#111827', marginTop: 4 },
  metaDivider: { width: 1, backgroundColor: '#EEEEEE' },

  // Dashed line
  dashed: {
    borderStyle: 'dashed', borderWidth: 1, borderColor: '#F0F0F0',
    marginVertical: 16, borderRadius: 1,
  },

  // Items
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9F9F9',
  },
  itemName:  { fontSize: 13, fontWeight: '600', color: '#111827' },
  itemQty:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: '#374151' },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: '#9CA3AF' },
  summaryValue: { fontSize: 12, color: '#374151', fontWeight: '500' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F5F5F5',
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 22, fontWeight: '800', color: ACCENT },

  // Cash
  cashSection: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginTop: 16,
  },
  cashRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cashLabel: { fontSize: 12, color: '#374151' },
  cashValue: { fontSize: 12, color: '#374151' },

  // Footer
  receiptFooter: { alignItems: 'center', paddingTop: 4 },
  footerThanks: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  footerSub:    { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },

  // Action buttons
  actions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  printBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: ACCENT, borderRadius: 16, paddingVertical: 14,
    backgroundColor: ACCENT_LIGHT,
  },
  printBtnText: { fontSize: 14, fontWeight: '700', color: ACCENT },
  newBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 14,
  },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});