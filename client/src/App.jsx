import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

function RequireAuth({ children, adminOnly = false }) {
  const location = useLocation();
  const token = localStorage.getItem("auth_token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("zero_user") || "null");
  } catch {
    user = null;
  }
  if (!token || !user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (adminOnly && String(user.role || "").toUpperCase() !== "ADMIN") {
    return <Navigate to="/home" replace />;
  }
  return children;
}

function RequirePrivateChat({ children }) {
  if (sessionStorage.getItem("private_chat_unlocked") !== "yes") {
    return <Navigate to="/game" replace />;
  }
  return children;
}

function AppRoutes() {
  useEffect(() => {
    const protectRestoredPage = () => {
      if (!localStorage.getItem("auth_token") && window.location.pathname !== "/") {
        window.location.replace("/");
      }
    };
    window.addEventListener("pageshow", protectRestoredPage);
    return () => window.removeEventListener("pageshow", protectRestoredPage);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/game" element={<RequireAuth><Game /></RequireAuth>} />
      <Route path="/chat" element={<RequireAuth><RequirePrivateChat><Chat /></RequirePrivateChat></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
export default App;
