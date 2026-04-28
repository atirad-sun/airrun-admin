import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";

/**
 * Magic-link landing page. Supabase JS auto-detects the URL hash on import
 * (detectSessionInUrl: true), so by the time this component mounts we either
 * have a session or the link is invalid/expired.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        navigate("/", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-svh place-items-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
