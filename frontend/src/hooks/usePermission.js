import { useAuth } from '../context/AuthContext';

export function usePermission(...keys) {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role_slug === 'super_admin') return true;
  return keys.some((k) => user.permissions?.includes(k));
}
