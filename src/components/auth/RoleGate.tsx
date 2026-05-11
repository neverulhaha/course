import { Navigate } from "react-router";
import SuspenseFallback from "@/app/SuspenseFallback";
import { useProfile } from "@/providers/ProfileProvider";
import { canManageCourseSections, normalizeProfileRole } from "@/lib/profileRole";

interface CourseManagementRouteProps {
  children: React.ReactNode;
}

export function CourseManagementRoute({ children }: CourseManagementRouteProps) {
  const { profile, loading } = useProfile();

  if (loading) {
    return <SuspenseFallback />;
  }

  const role = normalizeProfileRole(profile?.app_role);
  if (!canManageCourseSections(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
