import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { Toaster } from "sonner";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
