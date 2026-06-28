import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { Shipments } from '@/pages/Shipments';
import { ShipmentDetail } from '@/pages/ShipmentDetail';
import { Invoices } from '@/pages/Invoices';
import { InvoiceDetail } from '@/pages/InvoiceDetail';
import { Documents } from '@/pages/Documents';
import { Emails } from '@/pages/Emails';
import { Payments } from '@/pages/Payments';
import { Disputes } from '@/pages/Disputes';
import { Customers } from '@/pages/Customers';
import { Review } from '@/pages/Review';
import { Reports } from '@/pages/Reports';
import { Ledger } from '@/pages/Ledger';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

function RequireAuth({ children }) {
  const { accessToken } = useAuth();
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="review" element={<Review />} />
        <Route path="emails" element={<Emails />} />
        <Route path="payments" element={<Payments />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="customers" element={<Customers />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/gmail" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
