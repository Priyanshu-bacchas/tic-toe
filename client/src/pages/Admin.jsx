import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import "./Admin.css";

export default function Admin(){
  const [tab,setTab]=useState("users"),[users,setUsers]=useState([]),[messages,setMessages]=useState([]),[search,setSearch]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){
    setBusy(true);setError("");
    try{
      const data=await apiRequest(tab==="users"?"/api/admin/users":"/api/admin/chats");
      if(tab==="users")setUsers(data.users||[]);else setMessages(data.messages||[]);
    }catch(e){setError(e.message||"Unable to load admin data.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{load();},[tab]);
  const filteredUsers=useMemo(()=>users.filter(u=>[u.name,u.email,u.gameId].join(" ").toLowerCase().includes(search.toLowerCase())),[users,search]);
  const filteredMessages=useMemo(()=>messages.filter(m=>[m.content,m.sender?.name,m.receiver?.name,m.sender?.email,m.receiver?.email].join(" ").toLowerCase().includes(search.toLowerCase())),[messages,search]);
  async function editUser(user){
    const name=window.prompt("User name:",user.name);if(name===null)return;
    const email=window.prompt("User email:",user.email);if(email===null)return;
    try{await apiRequest("/api/admin/users/"+user.id,{method:"PATCH",body:JSON.stringify({name,email})});await load();}
    catch(e){window.alert(e.message);}
  }
  async function deleteUser(user){
    if(!window.confirm("Delete "+user.name+" and their related data permanently?"))return;
    try{await apiRequest("/api/admin/users/"+user.id,{method:"DELETE"});await load();}
    catch(e){window.alert(e.message);}
  }
  async function deleteMessage(message){
    if(!window.confirm("Delete this chat message permanently?"))return;
    try{await apiRequest("/api/admin/chats/"+message.id,{method:"DELETE"});await load();}
    catch(e){window.alert(e.message);}
  }
  return <main className="admin-shell">
    <header className="admin-head"><div><span className="admin-kicker">ZERO CROSS CONTROL</span><h1>Admin Panel</h1><p>Manage registered users and chat messages</p></div><button onClick={load} disabled={busy}>↻ Refresh</button></header>
    <nav className="admin-tabs"><button className={tab==="users"?"active":""} onClick={()=>{setTab("users");setSearch("");}}>Users <b>{users.length}</b></button><button className={tab==="chats"?"active":""} onClick={()=>{setTab("chats");setSearch("");}}>Chats <b>{messages.length}</b></button></nav>
    <input className="admin-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==="users"?"Search name, email or Game ID":"Search message or user..."}/>
    {error&&<p className="admin-error">{error}</p>}
    {busy?<p className="admin-empty">Loading...</p>:tab==="users"?<section className="admin-list">{filteredUsers.map(u=><article className="admin-card" key={u.id}><div className="admin-avatar">{(u.name||"?").slice(0,1).toUpperCase()}</div><div className="admin-info"><strong>{u.name}</strong><span>{u.email}</span><small>{u.gameId} · Joined {new Date(u.createdAt).toLocaleDateString()} · {(u._count?.sentMessages||0)+(u._count?.receivedMessages||0)} messages</small></div><div className="admin-actions"><button onClick={()=>editUser(u)}>Edit</button><button className="danger" onClick={()=>deleteUser(u)}>Delete</button></div></article>)}{!filteredUsers.length&&<p className="admin-empty">No users found.</p>}</section>:<section className="admin-list">{filteredMessages.map(m=><article className="admin-message" key={m.id}><div className="admin-message-top"><strong>{m.sender?.name||"User"} <span>→</span> {m.receiver?.name||"User"}</strong><small>{new Date(m.createdAt).toLocaleString()}</small></div><p>{m.content}</p><button className="danger" onClick={()=>deleteMessage(m)}>Delete message</button></article>)}{!filteredMessages.length&&<p className="admin-empty">No messages found.</p>}</section>}
  </main>;
}
