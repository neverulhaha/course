import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
