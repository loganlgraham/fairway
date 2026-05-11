import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/layout/AppShell";
import LoginPage from "./routes/LoginPage";
import AuthCallbackPage from "./routes/AuthCallbackPage";
import HomePage from "./routes/HomePage";
import NewRoundPage from "./routes/NewRoundPage";
import RoundPage from "./routes/RoundPage";
import RoundSummaryPage from "./routes/RoundSummaryPage";
import ProfilePage from "./routes/ProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/rounds/new" element={<NewRoundPage />} />
        <Route path="/rounds/:roundId" element={<RoundPage />} />
        <Route path="/rounds/:roundId/summary" element={<RoundSummaryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
