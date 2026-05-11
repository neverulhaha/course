import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import SuspenseFallback from "./SuspenseFallback";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthCallback from "./pages/auth/AuthCallback";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./components/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CourseManagementRoute } from "@/components/auth/RoleGate";

const CreateCourse    = lazy(() => import("./pages/CreateCourse"));
const CreateFromSource= lazy(() => import("./pages/CreateFromSource"));
const PlanResult      = lazy(() => import("./pages/PlanResult"));
const CourseEditor    = lazy(() => import("./pages/CourseEditor"));
const CourseLearners  = lazy(() => import("./pages/CourseLearners"));
const QAReport          = lazy(() => import("./pages/QAReport"));
const VersionHistory    = lazy(() => import("./pages/VersionHistory"));
const ProgressDashboard = lazy(() => import("./pages/ProgressDashboard"));
const UserProfile       = lazy(() => import("./pages/UserProfile"));
const Settings          = lazy(() => import("./pages/Settings"));
const CoursePlayer    = lazy(() => import("./pages/CoursePlayer"));
const QuizTaking      = lazy(() => import("./pages/QuizTaking"));
const NotFound        = lazy(() => import("./pages/NotFound"));
const Forbidden       = lazy(() => import("./pages/Forbidden"));
const LoadError       = lazy(() => import("./pages/LoadError"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>;
}
function ProtectedLazy({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><Lazy>{children}</Lazy></ProtectedRoute>;
}

function ManagerLazy({ children }: { children: React.ReactNode }) {
  return <CourseManagementRoute><Lazy>{children}</Lazy></CourseManagementRoute>;
}

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/login", element: <Navigate to="/auth/login" replace /> },
  { path: "/register", element: <Navigate to="/auth/register" replace /> },
  { path: "/courses", element: <Navigate to="/app" replace /> },
  { path: "/auth", element: <Navigate to="/auth/login" replace /> },
  { path: "/auth/login", Component: Login },
  { path: "/auth/register", Component: Register },
  { path: "/auth/forgot", element: <Navigate to="/auth/login" replace /> },
  { path: "/auth/callback", Component: AuthCallback },
  { path: "/auth/update-password", element: <Navigate to="/auth/login" replace /> },
  {
    path: "/app",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, Component: Dashboard },
      { path: "create", element: <ManagerLazy><CreateCourse /></ManagerLazy> },
      { path: "create-source", element: <ManagerLazy><CreateFromSource /></ManagerLazy> },
      { path: "source/create", element: <Navigate to="/app/create-source" replace /> },
      { path: "plan/:courseId", element: <ManagerLazy><PlanResult /></ManagerLazy> },
      { path: "editor/:courseId", element: <ManagerLazy><CourseEditor /></ManagerLazy> },
      { path: "learners/:courseId", element: <ManagerLazy><CourseLearners /></ManagerLazy> },
      { path: "qa/:courseId", element: <ManagerLazy><QAReport /></ManagerLazy> },
      { path: "versions/:courseId", element: <ManagerLazy><VersionHistory /></ManagerLazy> },
      { path: "progress", element: <Lazy><ProgressDashboard /></Lazy> },
      { path: "profile", element: <Lazy><UserProfile /></Lazy> },
      { path: "settings", element: <Lazy><Settings /></Lazy> },
    ],
  },
  { path: "/learn/:courseId", element: <ProtectedLazy><CoursePlayer /></ProtectedLazy> },
  { path: "/learn/:courseId/lesson/:lessonId", element: <ProtectedLazy><CoursePlayer /></ProtectedLazy> },
  { path: "/learn/:courseId/quiz/:quizId", element: <ProtectedLazy><QuizTaking /></ProtectedLazy> },
  { path: "/forbidden", element: <Lazy><Forbidden /></Lazy> },
  { path: "/load-error", element: <Lazy><LoadError /></Lazy> },
  { path: "*", element: <Lazy><NotFound /></Lazy> },
]);
