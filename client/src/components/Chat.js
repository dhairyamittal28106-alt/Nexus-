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
  const [activeTargetId, setActiveTargetId] = useState(null); // ✨ NEW: Track ID for DB query
  const [showStickers, setShowStickers] = useState(false);
  
  const [typingStatus, setTypingStatus] = useState("");
  const [seenCounts, setSeenCounts] = useState({}); 
  
  const scrollRef = useRef(null);
  const username = localStorage.getItem('username') || "Anonymous";
  const myId = localStorage.getItem('myId'); // ✨ NEW: Current user's DB ID
  const stickers = ["🔥", "😂", "😍", "😎", "🥳", "🤯", "👀", "🙏", "💀", "🚀"];

  useEffect(() => {
    socket.emit("user_online", { name: username, userId: myId });

    socket.on("update_user_list", (users) => {
      // Store full user objects to get IDs for DMing
      setOnlineUsers(users.filter(u => u.name !== username));
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

    socket.on("display_typing", (data) => setTypingStatus(`${data.user} is typing...`));
    socket.on("hide_typing", () => setTypingStatus(""));

    socket.on("update_seen_status", (data) => {
      setSeenCounts(prev => ({
        ...prev,
        [data.id]: (prev[data.id] || 0) + 1
      }));
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
    };
  }, [username, myId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messageList, typingStatus]);

  // ✨ NEW: Fetch messages from MongoDB history
  const fetchChatHistory = async (targetId) => {
    if (!myId || !targetId) return;
    try {
      const res = await fetch(`http://localhost:5001/api/messages/${myId}/${targetId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const formattedHistory = data.map(m => ({
          id: m._id,
          room: room,
          author: m.sender === myId ? username : activeTarget,
          message: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isHistory: true
        }));
        setMessageList(formattedHistory);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    }
  };

  const createRoom = () => setRoom(Math.random().toString(36).substring(2, 8).toUpperCase());

  const joinRoom = (targetRoom, targetId = null) => {
    const finalRoom = targetRoom || room;
    if (finalRoom !== "") {
      socket.emit("join_room", finalRoom);
      setRoom(finalRoom);
      setShowChat(true);
      setMessageList([]);
      if (targetId) fetchChatHistory(targetId); // Load history if it's a DM
    }
  };

  const startDmWith = (peerName) => {
    // Find user ID from onlineUsers list
    const peer = onlineUsers.find(u => u.name === peerName);
    const peerId = peer ? peer.userId : null;
    
    const dmId = ["DM", username, peerName].sort().join("_");
    setActiveTarget(peerName);
    setActiveTargetId(peerId);
    joinRoom(dmId, peerId);
  };

  const sendMessage = async () => {
    if (!currentMessage || !room) return;
    socket.emit("stop_typing", { room });

    const data = {
      id: username + Date.now(),
      room: String(room),
      author: String(username),
      senderId: myId, // ✨ Required for DB storage
      receiverId: activeTargetId, // ✨ Required for DB storage
      message: String(currentMessage),
      time: String(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    };

    await socket.emit("send_message", data);
    setMessageList((list) => [...list, data]);
    setCurrentMessage("");
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    if (e.target.value !== "") {
      socket.emit("typing", { room, user: username });
    } else {
      socket.emit("stop_typing", { room });
    }
  };

  const sendSticker = (sticker) => {
    setShowStickers(false);
    if (!room) return;
    const data = {
      id: username + Date.now(),
      room: String(room),
      author: String(username),
      senderId: myId,
      receiverId: activeTargetId,
      message: String(sticker),
      time: String(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    };
    socket.emit("send_message", data);
    setMessageList((list) => [...list, data]);
  };

  const sendWhatsApp = () => {
    if (!room || !phone) return alert("Enter Room ID and Phone Number");
    window.open(`https://wa.me/${phone}?text=Join my Nexus Squad! Room ID: ${room}`, '_blank');
  };

  const startCall = (mode) => {
    if (!room) return alert("Join a room or DM first");
    const callUrl = `https://meet.jit.si/NEXUS-${mode}-${encodeURIComponent(room)}`;
    window.open(callUrl, "_blank");
  };

  return (
    <div className="container mt-5 pt-5">
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
                  <div key={u.id} className="user-item d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: '#27272a' }}>
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
              <strong>{activeTarget ? `DM: ${activeTarget}` : `Room: ${room}`}</strong>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-info" onClick={() => startCall("voice")}>📞</button>
              <button className="btn btn-sm btn-outline-info" onClick={() => startCall("video")}>📹</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => setShowChat(false)}>Exit</button>
            </div>
          </div>
          <div className="card-body bg-black" ref={scrollRef} style={{ overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
            {messageList.map((msg, i) => (
              <div key={i} className={`d-flex mb-3 ${msg.author === username ? "justify-content-end" : "justify-content-start"}`}>
                <div className={`p-2 rounded-3 shadow-sm ${msg.author === username ? "bg-primary text-white" : "bg-dark text-white border border-secondary"}`} style={{ maxWidth: '75%' }}>
                  <div className="small opacity-50 mb-1" style={{ fontSize: "0.7rem" }}>@{msg.author}</div>
                  <div style={{ fontSize: msg.message && msg.message.length <= 3 ? "2.5rem" : "1rem", wordBreak: 'break-word' }}>{msg.message}</div>
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <div className="small opacity-50" style={{ fontSize: "0.6rem" }}>{msg.time}</div>
                    {msg.author === username && (
                      <div className="small" style={{ fontSize: "0.6rem", color: '#00ffcc' }}>
                        {seenCounts[msg.id] ? `Seen by ${seenCounts[msg.id]}` : '✓ Delivered'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {typingStatus && <div className="text-info small mb-2 animate-pulse">{typingStatus}</div>}
          </div>
          <div className="card-footer bg-dark border-top border-secondary">
            <button className="btn btn-sm btn-outline-light mb-2" onClick={() => setShowStickers(!showStickers)}>😊 Stickers</button>
            {showStickers && (
              <div className="mb-2 p-2 bg-dark rounded border border-secondary d-flex flex-wrap gap-2">
                {stickers.map(s => <span key={s} onClick={() => sendSticker(s)} style={{ fontSize: '1.5rem', cursor: 'pointer' }}>{s}</span>)}
              </div>
            )}
            <div className="input-group">
              <input type="text" className="form-control bg-black text-white border-secondary" placeholder="Message..." value={currentMessage} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
              <button onClick={sendMessage} className="btn btn-primary px-4">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;