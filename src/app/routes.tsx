import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import SuspenseFallback from "./SuspenseFallback";

// Eager-loaded (always needed on first visit)
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import UpdatePassword from "./pages/auth/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./components/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy-loaded (heavy pages, never the first page shown)
const CreateCourse    = lazy(() => import("./pages/CreateCourse"));
const CreateFromSource= lazy(() => import("./pages/CreateFromSource"));
const PlanResult      = lazy(() => import("./pages/PlanResult"));
const CourseEditor    = lazy(() => import("./pages/CourseEditor"));
const LessonEditor    = lazy(() => import("./pages/LessonEditor"));
const QuizEditor      = lazy(() => import("./pages/QuizEditor"));
const QAReport          = lazy(() => import("./pages/QAReport"));
const VersionHistory    = lazy(() => import("./pages/VersionHistory"));
const ProgressDashboard = lazy(() => import("./pages/ProgressDashboard"));
const UserProfile       = lazy(() => import("./pages/UserProfile"));
const Settings          = lazy(() => import("./pages/Settings"));
const CoursePlayer    = lazy(() => import("./pages/CoursePlayer"));
const Assignment      = lazy(() => import("./pages/Assignment"));
const QuizTaking      = lazy(() => import("./pages/QuizTaking"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  /* ── Public ── */
  { path: "/",                 Component: Landing },

  /* ── Auth ── */
  { path: "/auth",             element: <Navigate to="/auth/login" replace /> },
  { path: "/auth/login",       Component: Login },
  { path: "/auth/register",    Component: Register },
  { path: "/auth/forgot",      Component: ForgotPassword },
  { path: "/auth/callback",    Component: AuthCallback },
  { path: "/auth/update-password", Component: UpdatePassword },

  /* ── App (authenticated) ── */
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,                               Component: Dashboard },
      { path: "create",       element: <Lazy><CreateCourse /></Lazy> },
      { path: "create-source",element: <Lazy><CreateFromSource /></Lazy> },
      { path: "source/create",element: <Navigate to="/app/create-source" replace /> },
      { path: "plan/:courseId",        element: <Lazy><PlanResult /></Lazy> },
      { path: "editor/:courseId",      element: <Lazy><CourseEditor /></Lazy> },
      { path: "editor/:courseId/lesson/:lessonId", element: <Lazy><LessonEditor /></Lazy> },
      { path: "editor/:courseId/quiz/:quizId",     element: <Lazy><QuizEditor /></Lazy> },
      { path: "qa/:courseId",          element: <Lazy><QAReport /></Lazy> },
      { path: "versions/:courseId",    element: <Lazy><VersionHistory /></Lazy> },
      { path: "progress",              element: <Lazy><ProgressDashboard /></Lazy> },
      { path: "profile",               element: <Lazy><UserProfile /></Lazy> },
      { path: "settings",              element: <Lazy><Settings /></Lazy> },
    ],
  },

  /* ── Learning ── */
  { path: "/learn/:courseId",                            element: <Lazy><CoursePlayer /></Lazy> },
  { path: "/learn/:courseId/lesson/:lessonId",           element: <Lazy><CoursePlayer /></Lazy> },
  { path: "/learn/:courseId/assignment/:assignmentId",   element: <Lazy><Assignment /></Lazy> },
  { path: "/learn/:courseId/quiz/:quizId",               element: <Lazy><QuizTaking /></Lazy> },
]);
