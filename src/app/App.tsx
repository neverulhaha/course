import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <RouterProvider router={router} />
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
