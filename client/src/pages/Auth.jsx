import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { apiRequest } from "../lib/api";
import "./Auth.css";

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const completeAuth = ({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("zero_user", JSON.stringify(user));
    localStorage.setItem("logged", "true");
    navigate("/home");
  };

  const login = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      alert("Enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      });
      completeAuth(result);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    if (!name.trim() || !email.trim() || !signupPassword || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (signupPassword.length <  8) {
      alert("Password must contain at least 8 characters.");
      return;
    }
    try {
      setLoading(true);
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: signupPassword
        })
      });
      completeAuth(result);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo"><h1>ZERO</h1><h2>CROSS</h2></div>
        <div className="tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign Up</button>
        </div>

        {mode === "login" && (
          <div className="form">
            <input type="email" placeholder="Email address" autoComplete="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <div className="password-box">
              <input type={showLogin ? "text" : "password"} placeholder=" " autoComplete="current-password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <label>Password</label>
              <span onClick={() => setShowLogin(!showLogin)}>{showLogin ? <FaEye /> : <FaEyeSlash />}</span>
            </div>
            <button className="main-btn" onClick={login} disabled={loading}>{loading ? "PLEASE WAIT..." : "LOGIN"}</button>
            <p className="link" onClick={() => alert("Password reset is not available yet. Please contact support.")}>Forgot Password?</p>
          </div>
        )}

        {mode === "signup" && (
          <div className="form">
            <input placeholder="Your Name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Email address" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            <div className="password-box">
              <input type={showSignup ? "text" : "password"} placeholder=" " autoComplete="new-password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
              <label>Create Password (min 8 characters)</label>
              <span onClick={() => setShowSignup(!showSignup)}>{showSignup ? <FaEye /> : <FaEyeSlash />}</span>
            </div>
            <div className="password-box">
              <input type={showConfirm ? "text" : "password"} placeholder=" " autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <label>Confirm Password</label>
              <span onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <FaEye /> : <FaEyeSlash />}</span>
            </div>
            <button className="main-btn" onClick={signup} disabled={loading}>{loading ? "PLEASE WAIT..." : "CREATE ACCOUNT"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;
