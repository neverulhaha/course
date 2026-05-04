import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import SuspenseFallback from "@/app/SuspenseFallback";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Оборачивает приватный layout: пока идёт восстановление сессии — спиннер,
 * без пользователя — редирект на `/auth/login` с сохранением `from` для возврата после входа.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SuspenseFallback />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
