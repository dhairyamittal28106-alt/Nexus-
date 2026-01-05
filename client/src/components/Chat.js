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

  // ✨ NEW FEATURES STATES
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
      }
    });

    // ✨ RECEIVE REACTION
    socket.on("update_reaction", ({ messageId, emoji, user }) => {
      setReactions(prev => ({
        ...prev,
        [messageId]: { emoji, user }
      }));
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

  const startDmWith = async (peerName) => {
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

  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom(newRoom);
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

  // ✨ HANDLE REACTION CLICK
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
    <div className="container mt-5 pt-5">
      <style>{`
        .bubble-reply { background: rgba(255,255,255,0.1); border-left: 4px solid #007bff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 8px; }
        .reaction-chip { background: #333; border-radius: 12px; padding: 1px 6px; font-size: 0.7rem; position: absolute; bottom: -10px; border: 1px solid #555; }
        .reaction-picker { background: #222; border-radius: 20px; padding: 5px; display: none; position: absolute; top: -35px; left: 0; z-index: 10; border: 1px solid #444; }
        .message-wrapper:hover .reaction-picker { display: flex; gap: 8px; }
      `}</style>

      {!showChat ? (
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card p-4 h-100 text-center shadow-lg" style={{ background: '#18181b', border: '1px solid #333' }}>
              <h4 className="text-white mb-4">Squad Portal</h4>
              <div className="mb-3">
                <div className="input-group">
                  <input type="text" className="form-control" style={{ background: '#27272a', color: '#fff', border: 'none' }} placeholder="Phone +91..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <button onClick={sendWhatsApp} className="btn btn-success">📲 WA</button>
                </div>
              </div>
              <input type="text" className="form-control text-center fw-bold text-primary mb-3" style={{ background: '#27272a', color: '#fff', border: 'none' }} placeholder="ROOM ID" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} />
              <div className="d-flex gap-2 mb-4">
                <button onClick={createRoom} className="btn btn-outline-light w-50 btn-sm">✨ Create</button>
                <button onClick={() => { navigator.clipboard.writeText(room); setCopySuccess("Copied!"); }} className="btn btn-outline-info w-50 btn-sm">{copySuccess || "🔗 Copy"}</button>
              </div>
              <button onClick={() => joinRoom()} className="btn btn-primary w-100 py-3 fw-bold">ENTER SQUAD</button>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card p-4 h-100 shadow-lg" style={{ background: '#18181b', border: '1px solid #333' }}>
              <h4 className="text-white mb-4">Online Now 🟢</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {onlineUsers.length === 0 ? <p className="text-muted">Waiting for others...</p> : onlineUsers.map(u => (
                  <div key={u.userId} className="user-item d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: '#27272a' }}>
                    <span className="text-white">@{u.name}</span>
                    <button className="btn btn-sm btn-outline-light" onClick={() => startDmWith(u.name)}>DM</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mx-auto shadow-lg" style={{ maxWidth: "800px", height: "80vh", background: '#18181b', border: '1px solid #333' }}>
          <div className="card-header d-flex justify-content-between align-items-center bg-dark">
            <div className="text-white">
              <strong>{activeTarget || "Room: " + room}</strong><br/>
              <small className={lastSeen === "Online" ? "text-success" : "text-muted"}>{lastSeen}</small>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-danger" onClick={deleteHistory}>🗑️</button>
              <button className="btn btn-sm btn-outline-info" onClick={() => startCall("voice")}>📞</button>
              <button className="btn btn-sm btn-outline-info" onClick={() => startCall("video")}>📹</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => setShowChat(false)}>Exit</button>
            </div>
          </div>

          {isUploading && (
            <div className="progress" style={{ height: "4px", borderRadius: 0, background: 'transparent' }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated bg-info" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}

          <div className="card-body bg-black" ref={scrollRef} style={{ overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
            {messageList.map((msg, i) => (
              <div key={i} className={`d-flex mb-4 message-wrapper ${msg.author === username ? "justify-content-end" : "justify-content-start"}`} style={{ position: 'relative' }}>
                
                {/* ✨ REACTION PICKER (HOVER) */}
                <div className="reaction-picker">
                  {reactionEmojis.map(emoji => (
                    <span key={emoji} style={{ cursor: 'pointer' }} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</span>
                  ))}
                </div>

                <div className={`p-2 rounded-3 shadow-sm ${msg.author === username ? "bg-primary text-white" : "bg-dark text-white border border-secondary"}`} style={{ maxWidth: '75%', position: 'relative' }} onDoubleClick={() => setReplyTo(msg)}>
                  <div className="small opacity-50 mb-1 d-flex justify-content-between" style={{ fontSize: "0.7rem" }}>
                    <span>@{msg.author}</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => setReplyTo(msg)}>↩️</span>
                  </div>

                  {/* ✨ REPLY CONTEXT */}
                  {msg.replyTo && (
                    <div className="bubble-reply text-truncate">
                      <strong>@{msg.replyTo.author}:</strong> {msg.replyTo.message || "📷 Media"}
                    </div>
                  )}
                  
                  {msg.image && (
                    <div style={{ position: 'relative' }}>
                      <img src={msg.image} alt="sent" className="img-fluid rounded mb-1" style={{maxHeight: '280px', border: '1px solid #444', cursor: 'pointer'}} onClick={() => window.open(msg.image, "_blank")} />
                      <button onClick={() => downloadImage(msg.image)} className="btn btn-sm btn-dark opacity-75" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.7rem' }}>⬇️ Save</button>
                    </div>
                  )}

                  <div style={{ wordBreak: 'break-word' }}>{msg.message}</div>
                  
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <div className="small opacity-50" style={{ fontSize: "0.6rem" }}>{msg.time}</div>
                    {msg.author === username && (
                      <div className="small" style={{ fontSize: "0.6rem", color: seenCounts[msg.id] ? '#00ffcc' : '#fff' }}>
                        {seenCounts[msg.id] ? 'Read ✓✓' : 'Sent ✓'}
                      </div>
                    )}
                  </div>

                  {/* ✨ DISPLAY REACTION */}
                  {reactions[msg.id] && (
                    <div className="reaction-chip" title={`By ${reactions[msg.id].user}`}>
                      {reactions[msg.id].emoji}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typingStatus && <div className="text-info small mb-2 animate-pulse">{typingStatus}</div>}
          </div>

          <div className="card-footer bg-dark border-top border-secondary">
            {/* ✨ REPLY PREVIEW BAR */}
            {replyTo && (
              <div className="d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-secondary" style={{ fontSize: '0.8rem' }}>
                <div className="text-truncate">Replying to <strong>@{replyTo.author}</strong></div>
                <button className="btn btn-sm text-white" onClick={() => setReplyTo(null)}>✖</button>
              </div>
            )}

            <div className="d-flex gap-2 mb-2">
                <button className="btn btn-sm btn-outline-light" onClick={() => setShowStickers(!showStickers)}>😊 Stickers</button>
                <label className="btn btn-sm btn-outline-info mb-0" style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                  {isUploading ? "⏳ Uploading..." : "📷 Photo"}
                  <input type="file" hidden accept="image/*" disabled={isUploading} onChange={handleImageUpload} />
                </label>
            </div>
            
            {showStickers && (
              <div className="mb-2 p-2 bg-dark rounded border border-secondary d-flex flex-wrap gap-2">
                {stickers.map(s => <span key={s} onClick={() => sendSticker(s)} style={{ fontSize: '1.5rem', cursor: 'pointer' }}>{s}</span>)}
              </div>
            )}

            <div className="input-group">
              <input type="text" className="form-control bg-black text-white border-secondary" placeholder="Message..." value={currentMessage} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
              <button onClick={() => sendMessage()} className="btn btn-primary px-4">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;