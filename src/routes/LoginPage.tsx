import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Mail, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Fairway - Sign in";
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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
            Sign in
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            We&apos;ll email you a magic link. No password required.
          </p>

          {sent ? (
            <div className="mt-5 rounded-lg border border-line bg-cream-50 p-4 text-sm text-charcoal">
              <p className="font-medium text-forest">Check your inbox.</p>
              <p className="mt-1 text-charcoal-muted">
                We sent a sign-in link to <strong>{email}</strong>. Open it on
                this device to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
              {error ? (
                <p className="text-xs text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                fullWidth
                loading={submitting}
                leadingIcon={!submitting ? <Mail size={16} /> : undefined}
              >
                Send magic link
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
