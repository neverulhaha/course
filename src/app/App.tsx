import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";

function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppToaster />
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
