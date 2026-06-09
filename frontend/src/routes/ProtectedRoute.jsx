import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/ui/Loading';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
