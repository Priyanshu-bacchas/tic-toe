import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import "./Home.css";

function Home(){
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("zero_user") || "null");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");

  const logout = ()=>{
    localStorage.removeItem("logged");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("zero_user");
    navigate("/");
  };

  const saveRecovery = async () => {
    if (!recoveryAnswer.trim() || !currentPassword) {
      setRecoveryMessage("Enter your recovery answer and current password.");
      return;
    }
    try {
      setSavingRecovery(true);
      const result = await apiRequest("/api/auth/recovery-answer", {
        method: "PUT",
        body: JSON.stringify({ petAnswer: recoveryAnswer.trim(), password: currentPassword })
      });
      setRecoveryMessage(result.message || "Recovery answer saved.");
      setRecoveryAnswer("");
      setCurrentPassword("");
      setShowRecovery(false);
    } catch (error) {
      setRecoveryMessage(error.message);
    } finally {
      setSavingRecovery(false);
    }
  };

  return(
    <div className="home-page">
      <div className="home-card">
        <div className="logo"><h1>ZERO</h1><h2>CROSS</h2></div>
        <div className="welcome-box">
          <h3>Welcome</h3>
          <h2>{user?.name || "Player"}</h2>
          <p>Your Game ID</p>
          <div className="game-id">{user?.gameId || "------"}</div>
        </div>
        <button className="main-btn" onClick={()=>navigate("/game")}>🎮 START GAME</button>
        <button className="recovery-btn" onClick={()=>{setShowRecovery(v=>!v);setRecoveryMessage("");}}>
          🔐 Set Password Recovery Answer
        </button>
        {showRecovery && (
          <div className="recovery-panel">
            <p>Set a favourite-pet answer. You will need this with your Game ID if you forget your password.</p>
            <input value={recoveryAnswer} onChange={e=>setRecoveryAnswer(e.target.value)} placeholder="Favourite pet answer" autoComplete="off" />
            <input value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} type="password" placeholder="Current password" autoComplete="current-password" />
            <button className="main-btn" onClick={saveRecovery} disabled={savingRecovery}>{savingRecovery ? "SAVING..." : "SAVE RECOVERY ANSWER"}</button>
          </div>
        )}
        {recoveryMessage && <p className="recovery-message">{recoveryMessage}</p>}
        <button className="logout-btn" onClick={logout}>🚪 LOGOUT</button>
      </div>
    </div>
  );
}

export default Home;