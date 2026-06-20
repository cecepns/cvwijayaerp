import {
  LayoutDashboard, Settings, Users, Wallet, ShoppingCart, Package,
  Warehouse, UserCircle, FileText, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, ClipboardList, Truck, CreditCard, BarChart3, Shield,
} from 'lucide-react';

export const menuGroups = [
  {
    label: 'Utama',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { path: '/settings/company', label: 'Preferensi Perusahaan', icon: Settings },
      { path: '/settings/coa', label: 'Akun Perkiraan', icon: FileText },
      { path: '/settings/admins', label: 'Manajemen Admin', icon: Users },
      { path: '/settings/roles', label: 'Role Admin', icon: Shield },
    ],
  },
  {
    label: 'HRD',
    items: [
      { path: '/hrd/kasbon', label: 'Kasbon Rokok', icon: CreditCard },
      { path: '/master/employees', label: 'Data Karyawan', icon: Users },
      { path: '/hrd/advances', label: 'Transaksi Kasbon', icon: CreditCard },
      { path: '/hrd/reports', label: 'Laporan Kasbon', icon: BarChart3 },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { path: '/cash/receipts', label: 'Penerimaan Kas/Bank', icon: ArrowDownCircle },
      { path: '/cash/payments', label: 'Pembayaran Kas/Bank', icon: ArrowUpCircle },
      { path: '/cash/transfers', label: 'Transfer Kas/Bank', icon: RefreshCw },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      { path: '/master/customers', label: 'Data Pelanggan', icon: Users },
      { path: '/sales/down-payments', label: 'Uang Muka Penjualan', icon: Wallet },
      { path: '/sales/invoices', label: 'Faktur Penjualan', icon: FileText },
      { path: '/sales/receipts', label: 'Penerimaan Penjualan', icon: ArrowDownCircle },
      { path: '/sales/reports', label: 'Laporan Penjualan', icon: BarChart3 },
    ],
  },
  {
    label: 'Pembelian',
    items: [
      { path: '/master/suppliers', label: 'Data Pemasok', icon: Truck },
      { path: '/purchase/down-payments', label: 'Uang Muka Pembelian', icon: Wallet },
      { path: '/purchase/invoices', label: 'Faktur Pembelian', icon: FileText },
      { path: '/purchase/payments', label: 'Pembayaran Pembelian', icon: ArrowUpCircle },
      { path: '/purchase/reports', label: 'Laporan Pembelian', icon: BarChart3 },
    ],
  },
  {
    label: 'Gudang & Inventory',
    items: [
      { path: '/master/products', label: 'Barang & Jasa', icon: Package },
      { path: '/inventory/goods-receipts', label: 'Barang Masuk', icon: ArrowDownCircle },
      { path: '/inventory/goods-issues', label: 'Barang Keluar', icon: ArrowUpCircle },
      { path: '/inventory/stock-opnames', label: 'Stok Opname', icon: ClipboardList },
      { path: '/inventory/stock-adjustments', label: 'Penyesuaian Stok', icon: RefreshCw },
      { path: '/inventory/stocks', label: 'Data Barang (Stok)', icon: Warehouse },
    ],
  },
  {
    label: 'Akun',
    items: [
      { path: '/profile', label: 'Profile Saya', icon: UserCircle },
    ],
  },
];
