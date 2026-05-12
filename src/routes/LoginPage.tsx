import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Mail, Flag, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Fairway - Sign in";
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Account created. If email confirmation is enabled, check your inbox to verify your account.",
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 text-forest"
        >
          <Flag size={20} strokeWidth={2.2} />
          <span className="font-display text-2xl font-semibold tracking-tight">
            Fairway
          </span>
        </Link>
        <Card>
          <h1 className="font-display text-xl font-semibold text-forest">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            {mode === "signin"
              ? "Use email/password or Google."
              : "Create an account with email/password or Google."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={
                mode === "signin"
                  ? "chip-on w-full justify-center"
                  : "chip w-full justify-center"
              }
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={
                mode === "signup"
                  ? "chip-on w-full justify-center"
                  : "chip w-full justify-center"
              }
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onEmailSubmit} className="mt-4 space-y-3">
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="you@club.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? (
              <p className="text-xs text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="text-xs text-forest" role="status">
                {message}
              </p>
            ) : null}
            <Button
              type="submit"
              fullWidth
              loading={submitting}
              leadingIcon={!submitting ? <KeyRound size={16} /> : undefined}
            >
              {mode === "signin" ? "Sign in with email" : "Create account"}
            </Button>
          </form>

          <div className="my-4 divider" />

          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={googleLoading}
            leadingIcon={!googleLoading ? <Mail size={16} /> : undefined}
            onClick={onGoogleSignIn}
          >
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
