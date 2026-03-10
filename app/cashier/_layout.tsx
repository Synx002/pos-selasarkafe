// app/cashier/_layout.tsx
import Sidebar, { SidebarMenuItem } from '../../components/Sidebar';

const MENU: SidebarMenuItem[] = [
  { label: 'Dashboard',  icon: 'dashboard',        path: '/cashier' },
  { label: 'Transaksi', icon: 'shopping-cart', path: '/cashier/transaction' },
  { label: 'Riwayat',   icon: 'history',        path: '/cashier/history' },
  { label: 'Stok',      icon: 'inventory',      path: '/cashier/stock' },
  { label: 'Pengaturan', icon: 'settings',       path: '/cashier/settings' },
];

export default function CashierLayout() {
  return <Sidebar menu={MENU} roleLabel="Petugas Kasir" accentColor="#E597A0"/>;
}