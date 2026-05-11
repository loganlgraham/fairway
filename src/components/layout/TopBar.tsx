import { Link, NavLink } from "react-router-dom";
import { Flag, UserRound, LogOut } from "lucide-react";
import { useAuth } from "@/auth/useAuth";

export function TopBar() {
  const { signOut, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-forest">
          <Flag size={18} strokeWidth={2.2} />
          <span className="font-display text-xl font-semibold tracking-tight">
            Fairway
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm",
                isActive
                  ? "bg-cream-200 text-forest"
                  : "text-charcoal-muted hover:bg-cream-200 hover:text-charcoal",
              ].join(" ")
            }
            title={user?.email ?? undefined}
          >
            <UserRound size={16} />
            <span className="hidden sm:inline">Profile</span>
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-charcoal-muted hover:bg-cream-200 hover:text-charcoal"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
