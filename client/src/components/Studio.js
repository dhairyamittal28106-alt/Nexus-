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
      const res = await fetch("http://localhost:5001/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user: localStorage.getItem("username") || "Anonymous", 
          fileUrl: imageData, 
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
    <div className="container-fluid min-vh-100" style={{ background: '#09090b', color: '#e4e4e7', paddingTop: '100px' }}>
      <style>{`
        .glass-panel { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        
        .lens-frame { position: relative; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: #000; box-shadow: 0 0 30px rgba(0,0,0,0.5); height: 450px; }
        
        .filter-chip { padding: 10px 22px; border-radius: 100px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); background: rgba(255,255,255,0.03); font-size: 0.85rem; font-weight: 500; color: #a1a1aa; white-space: nowrap; }
        .filter-chip:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); color: white; }
        .filter-chip.active { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border-color: transparent; box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
        
        .master-canvas { width: 100%; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 0 40px rgba(0,0,0,0.8); background: #000; transition: 0.3s; }
        
        .btn-neon-primary { background: #7c3aed; color: white; border: none; border-radius: 16px; font-weight: 600; padding: 14px 24px; transition: 0.3s; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
        .btn-neon-primary:hover { background: #8b5cf6; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4); }
        
        .btn-neon-success { background: #10b981; color: white; border: none; border-radius: 16px; font-weight: 600; transition: 0.3s; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2); }
        .btn-neon-success:hover:not(:disabled) { background: #059669; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3); }
        
        .status-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="row justify-content-center px-lg-5">
        <div className="col-xl-11 glass-panel p-4 p-lg-5">
          
          {/* Header Area */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-5 gap-3">
            <div>
              <h1 className="fw-bold mb-1 text-uppercase tracking-tighter" style={{ fontSize: '2.5rem' }}>
                Nexus <span style={{ color: '#a855f7', textShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}>Studio</span>
              </h1>
              <p className="text-white-50 m-0 fs-6">Professional Neural Capture Interface v2.6</p>
            </div>
            <button onClick={startCamera} className="btn btn-outline-light rounded-pill px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
              Initialize Lens
            </button>
          </div>

          <div className="row g-5">
            {/* Live Preview Column */}
            <div className="col-lg-7">
              <div className="lens-frame mb-4">
                <video ref={videoRef} autoPlay className="w-100 h-100" style={{ filter: filter, objectFit: 'cover' }}></video>
                <div className="position-absolute top-0 start-0 m-4">
                  <div className="badge bg-black bg-opacity-50 border border-white border-opacity-10 px-3 py-2 rounded-pill">
                    <span className="status-dot"></span> LIVE FEED
                  </div>
                </div>
              </div>
              
              <div className="d-flex gap-2 overflow-auto no-scrollbar pb-2">
                {[
                  { id: "none", label: "Natural" },
                  { id: "grayscale(100%)", label: "Mono" },
                  { id: "sepia(100%)", label: "Vintage" },
                  { id: "invert(100%)", label: "X-Ray" },
                  { id: "hue-rotate(90deg)", label: "Cyber" },
                  { id: "blur(5px)", label: "Ethereal" }
                ].map((f) => (
                  <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Output & Actions Column */}
            <div className="col-lg-5">
              <div className="h-100 d-flex flex-column" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '30px' }}>
                <div className="mb-auto">
                  <label className="text-uppercase tracking-widest text-white-50 small d-block mb-3 text-center">Master Output</label>
                  <canvas ref={canvasRef} width="640" height="480" className="master-canvas mb-4"></canvas>
                </div>

                <div className="mt-4">
                  <button onClick={takePhoto} className="btn-neon-primary w-100 mb-3 fs-5">
                    Snap Frame ✨
                  </button>
                  
                  <div className="row g-2">
                    <div className="col-9">
                      <button onClick={postToReels} className="btn-neon-success w-100 py-3 h-100" disabled={isPosting}>
                        {isPosting ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : "🚀 Post to Reels"}
                      </button>
                    </div>
                    <div className="col-3">
                      <button onClick={downloadPhoto} className="btn btn-dark w-100 h-100" style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        ⬇️
                      </button>
                    </div>
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