import { useEffect, useState } from "react";
import App from "./App";
import AuthPage from "./AuthPage";
import { ChatWidget } from "./Chat";
import { api, getToken, setToken } from "../backend/api";

export default function Root() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  // If a token exists, check it is still valid
  useEffect(() => {
    if (!getToken()) return;

    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  if (checking) {
    return <div className="auth-wrap">Loading...</div>;
  }

  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <>
      <App user={user} onLogout={logout} />
      {/* Floating AI chatbot: shows on every page */}
      <ChatWidget />
    </>
  );
}