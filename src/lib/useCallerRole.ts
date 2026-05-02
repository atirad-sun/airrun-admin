// useCallerRole — fetch the current admin's role once per session.
//
// Phase P's admin-api auth cache returns `caller.role` on every
// request, but `pingWrite` is the only action that exposes it back to
// the SPA shape that's already plumbed.  We call ping once on mount
// (cached forever via react-query staleTime: Infinity) and every
// gate-aware screen reads from this hook.
//
// Reason this exists: D5's super-admin gating needs the role
// available during render so the SPA can hide buttons / show empty
// states.  Without it we'd flicker between "showing super-admin
// content" and "redirected to forbidden" or hide everything by
// default and pop in.  The server is still the security boundary —
// this hook only drives UX.

import { useQuery } from "@tanstack/react-query";
import { pingWrite } from "./adminApi";
import { qk } from "./queries";

export interface CallerInfo {
  email: string;
  role: "super_admin" | "editor" | "viewer";
  isSuperAdmin: boolean;
  // True for newly-invited admins until they rotate the temp password.
  // RequireRotated reads this to bounce them to /change-password.
  mustChangePassword: boolean;
}

export function useCallerRole(): {
  caller: CallerInfo | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: qk.callerRole(),
    queryFn: () => pingWrite(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!data) return { caller: null, isLoading };
  return {
    caller: {
      email: data.caller.email,
      role: data.caller.role,
      isSuperAdmin: data.caller.role === "super_admin",
      mustChangePassword: data.caller.must_change_password === true,
    },
    isLoading,
  };
}
