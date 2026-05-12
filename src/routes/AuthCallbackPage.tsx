import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // In SPA mode, Supabase parses auth tokens from the callback URL
        // (hash/query) via detectSessionInUrl, then exposes them via getSession.
        await supabase.auth.getSession();
        if (!cancelled) {
          navigate("/", { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Sign-in failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="card-padded max-w-sm text-center">
          <h1 className="font-display text-lg font-semibold text-forest">
            Sign-in failed
          </h1>
          <p className="mt-2 text-sm text-charcoal-muted">{error}</p>
          <div className="mt-4">
            <Button onClick={() => navigate("/login", { replace: true })}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <FullPageSpinner />;
}
