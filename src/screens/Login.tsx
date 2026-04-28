import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPassword } from "@/lib/auth";

type Status = "idle" | "signing-in" | "error";

function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  return message;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("signing-in");
    setError(null);
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) {
      setStatus("error");
      setError(friendlyError(error.message));
      return;
    }
    // RequireAuth lives only on protected routes — its onAuthStateChange
    // listener doesn't exist while we're on /login.  Push to / explicitly so
    // RequireAuth mounts, picks up the just-stored session, and renders the
    // admin shell.
    navigate("/", { replace: true });
  }

  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">airrun admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your work email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            required
            autoFocus
            placeholder="you@airrun.app"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={status === "signing-in"}
          >
            {status === "signing-in" ? "Signing in…" : "Sign in"}
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
