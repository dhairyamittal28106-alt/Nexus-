import React, { useRef, useState } from "react";

function Studio() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [filter, setFilter] = useState("none");
  const [isPosting, setIsPosting] = useState(false);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
    }).catch(err => alert("Camera access denied"));
  };

  const takePhoto = () => {
    const context = canvasRef.current.getContext("2d");
    context.filter = filter; 
    context.drawImage(videoRef.current, 0, 0, 640, 480);
  };

  const downloadPhoto = () => {
    const link = document.createElement("a");
    link.download = "Nexus_Studio_Photo.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const postToReels = async () => {
    const canvas = canvasRef.current;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) return alert("Capture an image first!");

    setIsPosting(true);
    const imageData = canvas.toDataURL("image/png");
    
    try {
      // ✨ SYNCED KEYS: Matching your specific Backend Schema requirements
      const res = await fetch("http://localhost:5001/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user: localStorage.getItem("username") || "Anonymous", 
          fileUrl: imageData, // Using fileUrl to match schema requirement
          caption: "Created in Nexus Studio 2026 ✨" 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Successfully posted to Reels! 🚀");
      } else {
        alert(`Server Error: ${data.error || data.message}`);
      }
    } catch (err) {
      alert("Post failed. Check server connection.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="container-fluid mt-5 pt-5 min-vh-100" style={{ background: '#09090b', color: 'white' }}>
      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; }
        .filter-btn { transition: 0.3s; border-radius: 12px; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #a1a1aa; }
        .filter-btn.active { background: linear-gradient(90deg, #6366f1, #a855f7); color: white; border: none; box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        .action-btn { border-radius: 100px; padding: 12px 30px; font-weight: 600; transition: 0.3s; }
      `}</style>

      <div className="row justify-content-center px-3">
        <div className="col-lg-11 glass-card p-4 shadow-lg">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Nexus <span style={{ color: '#a855f7' }}>Studio</span> 📸</h2>
            <button onClick={startCamera} className="btn btn-outline-info rounded-pill px-4">Initialize Lens</button>
          </div>

          <div className="row g-4">
            <div className="col-md-7">
              <div className="row g-3">
                <div className="col-12">
                  <div className="position-relative rounded-4 overflow-hidden border border-secondary" style={{ height: '400px' }}>
                    <video ref={videoRef} autoPlay className="w-100 h-100" style={{ filter: filter, objectFit: 'cover' }}></video>
                    <div className="position-absolute top-0 start-0 m-3 badge bg-danger shadow">LIVE FEED</div>
                  </div>
                </div>
                <div className="col-12">
                   <div className="d-flex gap-2 overflow-auto pb-2">
                    {["none", "grayscale(100%)", "sepia(100%)", "invert(100%)", "hue-rotate(90deg)", "blur(5px)"].map((f) => (
                      <button key={f} className={`filter-btn px-3 py-2 ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === "none" ? "Natural" : f.split('(')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-5">
              <div className="p-3 rounded-4 h-100 d-flex flex-column justify-content-between" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <small className="text-muted d-block mb-2 text-center text-uppercase tracking-widest">Master Output</small>
                  <canvas ref={canvasRef} width="640" height="480" className="w-100 rounded-4 border border-info mb-4 shadow-lg" style={{ background: '#000' }}></canvas>
                </div>

                <div className="d-grid gap-3">
                  <button onClick={takePhoto} className="btn btn-primary action-btn py-3 fs-5 shadow">Snap Frame ✨</button>
                  <div className="d-flex gap-2">
                    <button onClick={postToReels} className="btn btn-success action-btn flex-grow-1" disabled={isPosting}>
                      {isPosting ? "Posting..." : "🚀 Post to Reels"}
                    </button>
                    <button onClick={downloadPhoto} className="btn btn-outline-light action-btn" title="Download">⬇️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Studio;