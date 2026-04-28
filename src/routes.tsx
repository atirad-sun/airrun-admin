import { useEffect, useState } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import Login from "@/screens/Login";
import AuthCallback from "@/screens/AuthCallback";
import Overview from "@/screens/Overview";
import Parks from "@/screens/Parks";
import Users from "@/screens/Users";
import Reports from "@/screens/Reports";
import Bugs from "@/screens/Bugs";
import Feedback from "@/screens/Feedback";
import Settings from "@/screens/Settings";

/**
 * Auth gate: while we don't yet know the session, render nothing.
 * Once known, unauthenticated users get bounced to /login.
 *
 * NOTE: this only checks for a Supabase Auth session. Server-side admin
 * allow-list enforcement happens in the admin-api Edge Function — a non-admin
 * with a valid session will see the shell but every API call will 403.
 */
function RequireAuth() {
  const [status, setStatus] = useState<"checking" | "in" | "out">("checking");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "in" : "out");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") return null;
  if (status === "out") return <Navigate to="/login" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <Overview /> },
          { path: "parks", element: <Parks /> },
          { path: "users", element: <Users /> },
          { path: "reports", element: <Reports /> },
          { path: "bugs", element: <Bugs /> },
          { path: "feedback", element: <Feedback /> },
          { path: "settings", element: <Settings /> },
        ],
      },
    ],
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
