import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CompanyPreferencesPage from './pages/settings/CompanyPreferencesPage';
import ChartOfAccountsPage from './pages/settings/ChartOfAccountsPage';
import AdminManagementPage from './pages/settings/AdminManagementPage';
import RoleManagementPage from './pages/settings/RoleManagementPage';
import EmployeesPage from './pages/master/EmployeesPage';
import CustomersPage from './pages/master/CustomersPage';
import SuppliersPage from './pages/master/SuppliersPage';
import ProductsPage from './pages/master/ProductsPage';
import PurchaseInvoicesPage from './pages/purchase/PurchaseInvoicesPage';
import PurchaseDownPaymentsPage from './pages/purchase/PurchaseDownPaymentsPage';
import PurchasePaymentsPage from './pages/purchase/PurchasePaymentsPage';
import PurchaseReportsPage from './pages/purchase/PurchaseReportsPage';
import SalesInvoicesPage from './pages/sales/SalesInvoicesPage';
import SalesDownPaymentsPage from './pages/sales/SalesDownPaymentsPage';
import SalesReceiptsPage from './pages/sales/SalesReceiptsPage';
import SalesReportsPage from './pages/sales/SalesReportsPage';
import GoodsReceiptsPage from './pages/inventory/GoodsReceiptsPage';
import GoodsIssuesPage from './pages/inventory/GoodsIssuesPage';
import StockOpnamePage from './pages/inventory/StockOpnamePage';
import StockAdjustmentsPage from './pages/inventory/StockAdjustmentsPage';
import StockOverviewPage from './pages/inventory/StockOverviewPage';
import CashReceiptsPage from './pages/cash/CashReceiptsPage';
import CashPaymentsPage from './pages/cash/CashPaymentsPage';
import CashTransfersPage from './pages/cash/CashTransfersPage';
import EmployeeAdvancesPage from './pages/hrd/EmployeeAdvancesPage';
import AdvanceReportsPage from './pages/hrd/AdvanceReportsPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="settings/company" element={<CompanyPreferencesPage />} />
            <Route path="settings/coa" element={<ChartOfAccountsPage />} />
            <Route path="settings/admins" element={<AdminManagementPage />} />
            <Route path="settings/roles" element={<RoleManagementPage />} />
            <Route path="master/employees" element={<EmployeesPage />} />
            <Route path="master/customers" element={<CustomersPage />} />
            <Route path="master/suppliers" element={<SuppliersPage />} />
            <Route path="master/products" element={<ProductsPage />} />
            <Route path="purchase/down-payments" element={<PurchaseDownPaymentsPage />} />
            <Route path="purchase/invoices" element={<PurchaseInvoicesPage />} />
            <Route path="purchase/payments" element={<PurchasePaymentsPage />} />
            <Route path="purchase/reports" element={<PurchaseReportsPage />} />
            <Route path="sales/down-payments" element={<SalesDownPaymentsPage />} />
            <Route path="sales/invoices" element={<SalesInvoicesPage />} />
            <Route path="sales/receipts" element={<SalesReceiptsPage />} />
            <Route path="sales/reports" element={<SalesReportsPage />} />
            <Route path="inventory/goods-receipts" element={<GoodsReceiptsPage />} />
            <Route path="inventory/goods-issues" element={<GoodsIssuesPage />} />
            <Route path="inventory/stock-opnames" element={<StockOpnamePage />} />
            <Route path="inventory/stock-adjustments" element={<StockAdjustmentsPage />} />
            <Route path="inventory/stocks" element={<StockOverviewPage />} />
            <Route path="cash/receipts" element={<CashReceiptsPage />} />
            <Route path="cash/payments" element={<CashPaymentsPage />} />
            <Route path="cash/transfers" element={<CashTransfersPage />} />
            <Route path="hrd/advances" element={<EmployeeAdvancesPage />} />
            <Route path="hrd/reports" element={<AdvanceReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
