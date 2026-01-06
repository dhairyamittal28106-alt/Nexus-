import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5001");

function Chat() {
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [messageList, setMessageList] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copySuccess, setCopySuccess] = useState("");
  const [phone, setPhone] = useState("");
  const [activeTarget, setActiveTarget] = useState(null);
  const [activeTargetId, setActiveTargetId] = useState(null); 
  const [showStickers, setShowStickers] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [seenCounts, setSeenCounts] = useState({}); 
  const [lastSeen, setLastSeen] = useState(""); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [recentChats, setRecentChats] = useState(() => {
    const saved = localStorage.getItem("recent_nexus_chats");
    return saved ? JSON.parse(saved) : [];
  });

  const [replyTo, setReplyTo] = useState(null);
  const [reactions, setReactions] = useState({});

  const scrollRef = useRef(null);
  const username = localStorage.getItem('username') || "Anonymous";
  const myId = localStorage.getItem('myId'); 
  const stickers = ["🔥", "😂", "😍", "😎", "🥳", "🤯", "👀", "🙏", "💀", "🚀"];
  const reactionEmojis = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

  useEffect(() => {
    socket.emit("user_online", { name: username, userId: myId });

    socket.on("update_user_list", (users) => {
      setOnlineUsers(users.filter(u => u.name !== username));
      if (activeTargetId) {
        const target = users.find(u => u.userId === activeTargetId);
        setLastSeen(target ? "Online" : "Offline");
      }
    });

    socket.on("receive_message", (data) => {
      setMessageList((list) => {
        if (list.find(m => m.id === data.id)) return list;
        return [...list, data];
      });
      if (data.author !== username) {
        socket.emit("message_seen", { room: data.room, id: data.id, viewer: username });
        addToRecent(data.author);
      }
    });

    socket.on("update_reaction", ({ messageId, emoji, user }) => {
      setReactions(prev => ({ ...prev, [messageId]: { emoji, user } }));
    });

    socket.on("display_typing", (data) => setTypingStatus(`${data.user} is typing...`));
    socket.on("hide_typing", () => setTypingStatus(""));
    
    socket.on("update_seen_status", (data) => {
      setSeenCounts(prev => ({ ...prev, [data.id]: (prev[data.id] || 0) + 1 }));
    });

    const urlParams = new URLSearchParams(window.location.search);
    const dmParam = urlParams.get('dm');
    if (dmParam) startDmWith(decodeURIComponent(dmParam));

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("update_seen_status");
      socket.off("update_user_list");
      socket.off("update_reaction");
    };
  }, [username, myId, activeTargetId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messageList, typingStatus]);

  const addToRecent = (name) => {
    setRecentChats(prev => {
      const filtered = prev.filter(n => n !== name);
      const updated = [name, ...filtered].slice(0, 8);
      localStorage.setItem("recent_nexus_chats", JSON.stringify(updated));
      return updated;
    });
  };

  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom(newRoom);
  };

  const startDmWith = async (peerName) => {
    addToRecent(peerName);
    const peer = onlineUsers.find(u => u.name === peerName);
    let peerId = peer ? peer.userId : null;
    if (!peerId) {
      try {
        const res = await fetch(`http://localhost:5001/api/auth/user/${peerName}`);
        const data = await res.json();
        if (data._id) peerId = data._id;
      } catch (err) { console.error("DB lookup failed"); }
    }
    if (peerId && myId) {
        const dmId = ["DM", myId, peerId].sort().join("_");
        setActiveTarget(peerName);
        setActiveTargetId(peerId);
        setLastSeen(peer ? "Online" : "Offline");
        joinRoom(dmId, peerId, peerName);
    }
  };

  const fetchChatHistory = async (targetId, currentRoom, peerName) => {
    if (!myId || !targetId) return;
    try {
      const res = await fetch(`http://localhost:5001/api/messages/${myId}/${targetId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const formattedHistory = data.map(m => ({
          id: m._id,
          room: currentRoom,
          author: m.sender === myId ? username : peerName,
          message: m.text,
          image: m.image,
          replyTo: m.replyTo,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessageList(formattedHistory);
      }
    } catch (err) { console.error("History fetch failed:", err); }
  };

  const joinRoom = (targetRoom, targetId = null, peerName = null) => {
    const finalRoom = targetRoom || room;
    if (finalRoom !== "") {
      socket.emit("join_room", finalRoom);
      setRoom(finalRoom);
      setShowChat(true);
      setMessageList([]);
      if (targetId) fetchChatHistory(targetId, finalRoom, peerName); 
    }
  };

  const downloadImage = (url) => {
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.download = `Nexus_${Date.now()}.jpg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true); setUploadProgress(20);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        setUploadProgress(50);
        const response = await fetch("http://localhost:5001/api/messages/upload", {
          method: "POST", body: JSON.stringify({ data: reader.result }), headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (data.url) { setUploadProgress(100); sendMessage(data.url); }
      } catch (err) { alert("Upload failed"); } finally {
        setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 800);
      }
    };
    e.target.value = null;
  };

  const sendMessage = async (imgUrl = null) => {
    if (!currentMessage.trim() && !imgUrl) return;
    if (!room || !activeTargetId) return;
    socket.emit("stop_typing", { room });

    const data = {
      id: username + Date.now(),
      room: String(room),
      author: String(username),
      senderId: myId, 
      receiverId: activeTargetId, 
      message: imgUrl ? "" : String(currentMessage),
      image: imgUrl,
      replyTo: replyTo, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit("send_message", data);
    setCurrentMessage("");
    setReplyTo(null); 
  };

  const handleReaction = (messageId, emoji) => {
    socket.emit("send_reaction", { room, messageId, emoji, user: username });
    setReactions(prev => ({ ...prev, [messageId]: { emoji, user: username } }));
  };

  const deleteHistory = async () => {
    if (window.confirm("Delete all messages for this chat?")) {
      try {
        await fetch(`http://localhost:5001/api/messages/history/${myId}/${activeTargetId}`, { method: "DELETE" });
        setMessageList([]);
      } catch (err) { alert("Delete failed"); }
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    if (e.target.value !== "") socket.emit("typing", { room, user: username });
    else socket.emit("stop_typing", { room });
  };

  const sendSticker = (sticker) => {
    if (!room || !activeTargetId) return;
    const data = {
      id: username + Date.now(), room: String(room), author: String(username),
      senderId: myId, receiverId: activeTargetId, message: String(sticker), image: null,
      time: String(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    };
    socket.emit("send_message", data);
    setShowStickers(false);
  };

  const sendWhatsApp = () => {
    if (!room || !phone) return alert("Enter Room ID and Phone Number");
    window.open(`https://wa.me/${phone}?text=Join my Nexus Squad! Room ID: ${room}`, '_blank');
  };

  const startCall = (mode) => {
    if (!room) return alert("Join a room first");
    const callUrl = `https://meet.jit.si/NEXUS-${mode}-${encodeURIComponent(room)}`;
    window.open(callUrl, "_blank");
  };

  return (
    <div className="container-fluid min-vh-100" style={{ background: '#09090b', paddingTop: '80px', color: '#e4e4e7' }}>
      <style>{`
        .glass-card { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; }
        .neon-input { background: rgba(39, 39, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); color: white; border-radius: 12px; transition: 0.3s; }
        .neon-input:focus { background: rgba(39, 39, 42, 0.8); border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); outline: none; }
        .chat-bubble { border-radius: 18px; padding: 12px 16px; position: relative; animation: slideUp 0.3s ease-out; }
        .bubble-mine { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border-bottom-right-radius: 4px; }
        .bubble-theirs { background: rgba(39, 39, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-bottom-left-radius: 4px; }
        .recent-item { transition: 0.3s; border-radius: 16px; border: 1px solid transparent; }
        .recent-item:hover { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); transform: translateX(5px); }
        .reaction-picker { background: rgba(24, 24, 27, 0.9); backdrop-filter: blur(10px); border-radius: 30px; padding: 5px 15px; display: none; position: absolute; top: -45px; z-index: 100; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .message-wrapper:hover .reaction-picker { display: flex; gap: 12px; }
        .reaction-chip { background: rgba(39, 39, 42, 0.9); border-radius: 20px; padding: 2px 8px; font-size: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1); position: absolute; bottom: -12px; right: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .online-dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .reply-box { background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; padding: 5px 10px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 8px; }
      `}</style>

      {!showChat ? (
        <div className="row justify-content-center g-4 px-3">
          {/* SQUAD PORTAL */}
          <div className="col-lg-5">
            <div className="glass-card p-4 shadow-2xl h-100">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '14px' }}>🌌</div>
                <h4 className="m-0 fw-bold">Squad Portal</h4>
              </div>
              
              <div className="space-y-4">
                <div className="input-group mb-3">
                  <input type="text" className="neon-input form-control py-3" placeholder="Phone +91..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <button onClick={sendWhatsApp} className="btn btn-success px-4" style={{ borderRadius: '12px' }}>📲 WA</button>
                </div>
                
                <div className="mb-4">
                  <label className="small opacity-50 mb-2 ms-2">CHANNEL ID</label>
                  <input type="text" className="neon-input form-control text-center py-3 fw-bold fs-5" placeholder="_ _ _ _ _ _" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} />
                </div>

                <div className="d-flex gap-3 mb-4">
                  <button onClick={createRoom} className="btn btn-dark w-50 py-2" style={{ borderRadius: '12px', border: '1px solid #3f3f46' }}>✨ Generate</button>
                  <button onClick={() => { navigator.clipboard.writeText(room); setCopySuccess("Copied!"); }} className="btn btn-dark w-50 py-2" style={{ borderRadius: '12px', border: '1px solid #3f3f46' }}>{copySuccess || "🔗 Link"}</button>
                </div>
                
                <button onClick={() => joinRoom()} className="btn btn-primary w-100 py-3 fw-bold shadow-lg" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)', border: 'none', borderRadius: '16px' }}>
                  INITIALIZE CONNECTION
                </button>
              </div>
            </div>
          </div>

          {/* ONLINE & RECENT */}
          <div className="col-lg-5">
            <div className="glass-card p-4 shadow-2xl h-100">
              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                Live Feed <div className="online-dot"></div>
              </h5>
              <div className="custom-scroll mb-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {onlineUsers.length === 0 ? (
                  <div className="text-center py-4 opacity-30">Scan for lifeforms...</div>
                ) : onlineUsers.map(u => (
                  <div key={u.userId} className="d-flex justify-content-between align-items-center mb-2 p-3 recent-item" style={{ background: 'rgba(39, 39, 42, 0.4)' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>{u.name[0]}</div>
                        <span className="fw-bold">@{u.name}</span>
                    </div>
                    <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={() => startDmWith(u.name)}>Link DM</button>
                  </div>
                ))}
              </div>

              <h5 className="fw-bold mb-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>Recent Missions 🕒</h5>
              <div className="custom-scroll" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {recentChats.length === 0 ? <p className="opacity-30 small">No history found</p> : recentChats.map(name => (
                  <div key={name} onClick={() => startDmWith(name)} className="recent-item d-flex align-items-center mb-2 p-3" style={{ background: 'rgba(24, 24, 27, 0.4)' }}>
                    <div className="rounded-circle bg-dark border border-secondary d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="fw-bold text-white">@{name}</div>
                        <div className="small opacity-40">Click to resume transmission</div>
                    </div>
                    <span className="ms-auto opacity-30">→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CHAT INTERFACE */
        <div className="container py-2">
            <div className="glass-card mx-auto overflow-hidden shadow-2xl" style={{ maxWidth: "1000px", height: "85vh", display: 'flex', flexDirection: 'column' }}>
                {/* HEADER */}
                <div className="p-3 d-flex justify-content-between align-items-center" style={{ background: 'rgba(24, 24, 27, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '45px', height: '45px' }}>{activeTarget ? activeTarget[0] : '#'}</div>
                        <div>
                            <div className="fw-bold">{activeTarget || "Room: " + room}</div>
                            <div className="d-flex align-items-center gap-1">
                                <div className={lastSeen === "Online" ? "online-dot" : "bg-secondary rounded-circle"} style={{ width: '8px', height: '8px' }}></div>
                                <small className="opacity-50">{lastSeen}</small>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-dark rounded-circle" onClick={deleteHistory} title="Wipe History">🗑️</button>
                        <button className="btn btn-dark rounded-circle" onClick={() => startCall("voice")}>📞</button>
                        <button className="btn btn-dark rounded-circle" onClick={() => startCall("video")}>📹</button>
                        <button className="btn btn-danger rounded-pill px-4 ms-2" onClick={() => setShowChat(false)}>DISCONNECT</button>
                    </div>
                </div>

                {isUploading && (
                    <div style={{ height: "4px", background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', background: '#a855f7', width: `${uploadProgress}%`, transition: '0.3s', boxShadow: '0 0 10px #a855f7' }}></div>
                    </div>
                )}

                {/* MESSAGES AREA */}
                <div className="flex-grow-1 p-4 custom-scroll bg-black" ref={scrollRef} style={{ overflowY: 'auto' }}>
                    <div className="text-center opacity-20 small mb-5">End-to-End Encrypted via Nexus Node</div>
                    {messageList.map((msg, i) => (
                        <div key={i} className={`d-flex mb-4 message-wrapper ${msg.author === username ? "justify-content-end" : "justify-content-start"}`}>
                            <div className="reaction-picker">
                                {reactionEmojis.map(emoji => (
                                    <span key={emoji} className="fs-5" style={{ cursor: 'pointer' }} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</span>
                                ))}
                            </div>

                            <div className={`chat-bubble ${msg.author === username ? "bubble-mine" : "bubble-theirs"}`} style={{ maxWidth: '70%' }} onDoubleClick={() => setReplyTo(msg)}>
                                <div className="d-flex justify-content-between gap-4 mb-1">
                                    <span style={{ fontSize: "0.65rem", fontWeight: 'bold', opacity: 0.7 }}>@{msg.author}</span>
                                    <span className="opacity-50" style={{ fontSize: "0.65rem" }} onClick={() => setReplyTo(msg)}>↩️</span>
                                </div>

                                {msg.replyTo && (
                                    <div className="reply-box text-truncate">
                                        <div className="fw-bold" style={{ fontSize: '0.6rem' }}>@{msg.replyTo.author}</div>
                                        {msg.replyTo.message || "📷 Media"}
                                    </div>
                                )}
                                
                                {msg.image && (
                                    <div className="position-relative mb-2">
                                        <img src={msg.image} alt="sent" className="rounded-lg" style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(msg.image, "_blank")} />
                                        <button onClick={() => downloadImage(msg.image)} className="btn btn-sm btn-dark blur-sm position-absolute bottom-2 right-2" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '10px', fontSize: '0.6rem' }}>⬇️ Save</button>
                                    </div>
                                )}

                                <div className="fs-6">{msg.message}</div>
                                
                                <div className="d-flex justify-content-end align-items-center gap-2 mt-1" style={{ fontSize: "0.6rem" }}>
                                    <span className="opacity-50">{msg.time}</span>
                                    {msg.author === username && (
                                        <span style={{ color: seenCounts[msg.id] ? '#4ade80' : '#a1a1aa' }}>
                                            {seenCounts[msg.id] ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>

                                {reactions[msg.id] && (
                                    <div className="reaction-chip" title={`By ${reactions[msg.id].user}`}>
                                        {reactions[msg.id].emoji}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {typingStatus && <div className="text-primary small animate-pulse">● ● ● {typingStatus}</div>}
                </div>

                {/* FOOTER INPUT */}
                <div className="p-3" style={{ background: 'rgba(24, 24, 27, 0.9)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {replyTo && (
                        <div className="d-flex justify-content-between align-items-center mb-3 p-2 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                            <div className="small text-truncate">Replying to <span className="text-primary">@{replyTo.author}</span></div>
                            <button className="btn btn-sm opacity-50" onClick={() => setReplyTo(null)}>✖</button>
                        </div>
                    )}

                    <div className="d-flex gap-2 mb-3">
                        <button className="btn btn-dark rounded-pill px-3 btn-sm" style={{ border: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setShowStickers(!showStickers)}>😊 Stickers</button>
                        <label className="btn btn-dark rounded-pill px-3 btn-sm" style={{ border: '1px solid rgba(255,255,255,0.05)', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                            {isUploading ? "⏳ Sending..." : "📷 Photo"}
                            <input type="file" hidden accept="image/*" disabled={isUploading} onChange={handleImageUpload} />
                        </label>
                    </div>
                    
                    {showStickers && (
                        <div className="mb-3 p-3 glass-card d-flex flex-wrap gap-3 slide-up">
                            {stickers.map(s => <span key={s} onClick={() => sendSticker(s)} className="fs-3" style={{ cursor: 'pointer', transition: '0.2s transform' }}>{s}</span>)}
                        </div>
                    )}

                    <div className="d-flex gap-3 align-items-center">
                        <input 
                            type="text" 
                            className="neon-input form-control flex-grow-1 py-3" 
                            placeholder="Type transmission..." 
                            value={currentMessage} 
                            onChange={handleInputChange} 
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
                        />
                        <button onClick={() => sendMessage()} className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center shadow-lg" style={{ width: '55px', height: '55px', background: '#7c3aed' }}>
                            🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Chat;