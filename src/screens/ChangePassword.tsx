import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/adminApi";
import { signOut } from "@/lib/auth";
import { qk } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";

type Status = "idle" | "submitting" | "error";

const MIN_LEN = 8;

/**
 * Forced password rotation screen for newly-invited admins.
 *
 * Renders standalone (no AdminShell) so the user has nothing to click
 * away to.  RequireRotated keeps redirecting back here until the
 * server clears must_change_password.
 *
 * On success we sign the user out and bounce to /login with a flash
 * message — the user's request was that the new password be exercised
 * immediately by re-authenticating, rather than silently resuming the
 * old session.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { caller, isLoading } = useCallerRole();

  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const isForced = caller?.mustChangePassword === true;

  function validate(): string | null {
    if (pwd.length < MIN_LEN) return `Password must be at least ${MIN_LEN} characters.`;
    if (pwd !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setStatus("error");
      setError(v);
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      await changePassword({ new_password: pwd });
      // Drop the cached caller (which still says mustChangePassword=true)
      // even though we'll sign out next — defensive in case the sign-out
      // races with a re-render.
      queryClient.removeQueries({ queryKey: qk.callerRole() });
      await signOut();
      navigate("/login", {
        replace: true,
        state: { flash: "Password updated. Sign in again with your new password." },
      });
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  if (isLoading || !caller) return null;

  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">
            {isForced ? "Set your password" : "Change password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isForced
              ? "Choose a new password for your admin account before continuing."
              : "Pick a new password for your admin account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            required
            autoFocus
            placeholder={`New password (min ${MIN_LEN} chars)`}
            autoComplete="new-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <Input
            type="password"
            required
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Saving…" : "Save password"}
          </Button>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
