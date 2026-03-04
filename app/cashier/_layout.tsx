// app/cashier/_layout.tsx
import Sidebar, { SidebarMenuItem } from '../../components/Sidebar';

const MENU: SidebarMenuItem[] = [
  { label: 'Transaksi', icon: 'shopping-cart', path: '/cashier/transaction' },
  { label: 'Riwayat',   icon: 'history',        path: '/cashier/history' },
  { label: 'Stok',      icon: 'inventory',      path: '/cashier/stock' },
  { label: 'Laporan',   icon: 'bar-chart',      path: '/cashier/reports' },
];

export default function CashierLayout() {
  return <Sidebar menu={MENU} roleLabel="Petugas Kasir" />;
}