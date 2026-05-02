import { useEffect, useRef, useState } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";
import AdminShell from "@/components/AdminShell";
import Login from "@/screens/Login";
import Overview from "@/screens/Overview";
import Parks from "@/screens/Parks";
import Users from "@/screens/Users";
import Reports from "@/screens/Reports";
import Bugs from "@/screens/Bugs";
import Feedback from "@/screens/Feedback";
import Settings from "@/screens/Settings";
import ChangePassword from "@/screens/ChangePassword";

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
  // Track the last seen user id so we can detect a session change
  // (sign-out + sign-in as a different user on the same tab) and
  // evict cached data that belongs to the previous identity.  Plain
  // SIGNED_OUT events are also handled, but Supabase will sometimes
  // fire only TOKEN_REFRESHED when a new session takes the slot.
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      lastUserIdRef.current = data.session?.user.id ?? null;
      setStatus(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      // Any user-id transition — sign-out, sign-in-as-different-user,
      // or a token refresh that flipped identity — invalidates every
      // cached query.  Same-user TOKEN_REFRESHED keeps the cache.
      if (
        event === "SIGNED_OUT" ||
        nextUserId !== lastUserIdRef.current
      ) {
        queryClient.clear();
      }
      lastUserIdRef.current = nextUserId;
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

/**
 * Forced password rotation gate.
 *
 * Newly-invited admins are seeded with `must_change_password = true`
 * and a server-generated temp password.  This guard wraps the main
 * AdminShell and bounces anyone with the flag set to /change-password
 * regardless of which path they hit.  Once they rotate, the
 * change-password handler clears the flag and invalidates the
 * callerRole query, dropping the bounce.
 *
 * While the role hook is loading we render nothing — same shape as
 * RequireAuth — so the user doesn't briefly see the dashboard before
 * being redirected.
 */
function RequireRotated() {
  const { caller, isLoading } = useCallerRole();
  const location = useLocation();
  if (isLoading || !caller) return null;
  if (
    caller.mustChangePassword &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      // /change-password renders standalone (no AdminShell sidebar/topbar)
      // because it's a forced gate, not a normal navigable page.  Sits
      // inside RequireAuth so an unauthenticated visit still bounces to
      // /login.
      { path: "change-password", element: <ChangePassword /> },
      {
        element: <RequireRotated />,
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
    ],
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
