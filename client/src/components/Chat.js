import React, { useEffect, useState } from "react";

function Chat() {
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [messageList, setMessageList] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copySuccess, setCopySuccess] = useState("");
  const [phone, setPhone] = useState("");
  const [activeTarget, setActiveTarget] = useState(null); // DM target
  const [showStickers, setShowStickers] = useState(false);

  const username = localStorage.getItem('username') || "Anonymous";

  // Simple sticker pack
  const stickers = ["🔥", "😂", "😍", "😎", "🥳", "🤯", "👀", "🙏", "💀", "🚀"];

  useEffect(() => {
    // In this simplified version, we keep chat local to this browser only.
    // Online users list is empty until a multi-user backend is restored.
    setOnlineUsers([]);
    
    // Check if DM parameter is in URL (from Search page)
    const urlParams = new URLSearchParams(window.location.search);
    const dmParam = urlParams.get('dm');
    if (dmParam) {
      startDmWith(decodeURIComponent(dmParam));
    }
  }, [username]);

  const createRoom = () => setRoom(Math.random().toString(36).substring(2, 8).toUpperCase());

  const sendWhatsApp = () => {
    if(!room || !phone) return alert("Enter Room ID and Phone Number");
    window.open(`https://wa.me/${phone}?text=Join my Nexus Squad! Room ID: ${room}`, '_blank');
  };

  const joinRoom = (targetRoom) => {
    const finalRoom = targetRoom || room;
    if (finalRoom !== "") { 
      setRoom(finalRoom);
      setShowChat(true); 
      setMessageList([]);
    }
  };

  // Start a 1:1 DM room based on usernames (order-insensitive)
  const startDmWith = (peerName) => {
    const dmId = ["DM", username, peerName].sort().join("_");
    setActiveTarget(peerName);
    joinRoom(dmId);
  };

  const sendMessage = async () => {
    if (!currentMessage || !room) return;

    const data = { 
      room: String(room), 
      author: String(username), 
      message: String(currentMessage),
      time: String(new Date().toLocaleTimeString())
    };

    setMessageList((list) => [...list, data]);
    setCurrentMessage("");
  };

  const sendSticker = (sticker) => {
    // Stickers are just messages that happen to be big emoji
    setShowStickers(false);
    if (!room) return;
    
    const data = {
      room: String(room),
      author: String(username),
      message: String(sticker),
      time: String(new Date().toLocaleTimeString())
    };

    setMessageList((list) => [...list, data]);
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
            <div className="card p-4 h-100 text-center">
              <h4 className="text-white mb-4">Squad Portal</h4>
              
              {/* WhatsApp Feature */}
              <div className="mb-3">
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Phone +91..." value={phone} onChange={(e)=>setPhone(e.target.value)} />
                  <button onClick={sendWhatsApp} className="btn btn-success">📲 WA</button>
                </div>
              </div>

              <input type="text" className="form-control text-center fw-bold text-primary mb-3" placeholder="ROOM ID" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} />
              
              <div className="d-flex gap-2 mb-4">
                <button onClick={createRoom} className="btn btn-outline-light w-50 btn-sm">✨ Create</button>
                <button onClick={() => {navigator.clipboard.writeText(room); setCopySuccess("Copied!");}} className="btn btn-outline-info w-50 btn-sm">{copySuccess || "🔗 Copy"}</button>
              </div>
              <button onClick={joinRoom} className="btn btn-primary w-100 py-3">ENTER SQUAD</button>
            </div>
          </div>

          <div className="col-md-6 mb-4">
            <div className="card p-4 h-100">
              <h4 className="text-white mb-4">Online Now</h4>
              {onlineUsers.map(u => (
                <div key={u.id} className="user-item d-flex justify-content-between align-items-center mb-2">
                  <span>{u.name}</span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-light" onClick={() => startDmWith(u.name)}>DM</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card mx-auto" style={{ maxWidth: "800px", height: "80vh" }}>
          {/* Chat Header */}
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{activeTarget ? `DM with ${activeTarget}` : `Room: ${room}`}</strong>
              <div className="small text-muted">{username}</div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-light" onClick={() => startCall("voice")}>Voice Call</button>
              <button className="btn btn-sm btn-outline-light" onClick={() => startCall("video")}>Video Call</button>
            </div>
          </div>

          {/* Messages */}
          <div className="card-body bg-black" style={{overflowY: 'scroll'}}>
            {messageList.map((msg, i) => (
              <div key={i} className={`d-flex mb-2 ${msg.author === username ? "justify-content-end" : "justify-content-start"}`}>
                <div className={`p-2 rounded-3 ${msg.author === username ? "bg-primary" : "bg-dark border border-secondary"}`}>
                  <div className="small text-muted mb-1">@{msg.author}</div>
                  <div style={{ fontSize: msg.message && msg.message.length <= 3 ? "2rem" : "1rem" }}>
                    {msg.message}
                  </div>
                  <div className="small text-end opacity-50" style={{ fontSize: "0.7rem" }}>{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="card-footer">
            <div className="d-flex mb-2 gap-2">
              <button className="btn btn-sm btn-outline-light" onClick={() => setShowStickers(!showStickers)}>😊 Stickers</button>
            </div>
            {showStickers && (
              <div className="mb-2 p-2 bg-dark rounded-3" style={{ maxHeight: "120px", overflowY: "auto" }}>
                {stickers.map((s) => (
                  <button
                    key={s}
                    className="btn btn-sm btn-dark me-1 mb-1"
                    onClick={() => sendSticker(s)}
                  >
                    <span style={{ fontSize: "1.4rem" }}>{s}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={currentMessage}
                onChange={(e)=>setCurrentMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              />
              <button onClick={sendMessage} className="btn btn-success">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;