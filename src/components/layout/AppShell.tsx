import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="min-h-screen bg-cream">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
