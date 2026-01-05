import React, { useState } from "react";

function Jukebox({ setActiveSong }) {
  const [currentLocalSong, setCurrentLocalSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [source, setSource] = useState("yt"); // Default source: YouTube Music

  // ✨ MISSION: Multi-Source Config for UI Styling & Branding
  const sourceConfig = {
    yt: { name: "YT Music", color: "#FF0000", icon: "🔴" },
    spotify: { name: "Spotify", color: "#1DB954", icon: "🟢" },
    gaana: { name: "Gaana/Saavn", color: "#e72c33", icon: "🟠" },
    free: { name: "Open Source", color: "#00d2ff", icon: "💎" }
  };

  const handleSearch = async (e) => {
    // Trigger on Enter key or Search Icon click
    if (e.key === "Enter" || e.type === "click") {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
        // Fetching from the Resilient Hub Backend
        const res = await fetch(`http://localhost:5001/api/music/search?q=${encodeURIComponent(searchQuery)}&source=${source}`);
        
        // Handle node errors gracefully
        if (!res.ok) throw new Error("Music Hub nodes unreachable");
        
        const data = await res.json();
        
        // Handling the array of real results (or the Backup Stream if nodes are busy)
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Nexus Music Search Error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handlePlay = (song) => {
    setCurrentLocalSong(song);
    // ✨ Syncs with your global App.js player for persistent background play
    if (setActiveSong) setActiveSong(song); 
  };

  return (
    <div className="container mt-5 pt-5 min-vh-100" style={{ color: 'white' }}>
      <style>{`
        .source-chip { padding: 8px 18px; border-radius: 100px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; font-size: 0.8rem; background: rgba(0,0,0,0.3); color: #aaa; }
        .source-chip:hover { transform: translateY(-3px); background: rgba(255,255,255,0.05); }
        .source-chip.active { border-color: currentColor; color: inherit; background: rgba(255,255,255,0.1); font-weight: bold; box-shadow: 0 0 15px currentColor; }
        
        .glass-list-item { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 15px; transition: 0.3s; cursor: pointer; }
        .glass-list-item:hover { background: rgba(255, 255, 255, 0.08); transform: scale(1.02); border-color: ${sourceConfig[source].color}; box-shadow: 0 0 15px ${sourceConfig[source].color}33; }
        
        .vinyl-record { 
          width: 220px; height: 220px; border-radius: 50%; 
          background: radial-gradient(circle, #222 30%, #000 70%); 
          border: 8px solid #333; animation: spin 4s linear infinite; 
          box-shadow: 0 0 40px rgba(0,0,0,0.6); position: relative;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .now-playing-glass { backdrop-filter: blur(25px); border-radius: 40px; border: 1px solid rgba(255, 255, 255, 0.1); }
        
        .search-input-glass { 
          background: rgba(0,0,0,0.4); border: 1px solid ${sourceConfig[source].color}55; 
          border-radius: 100px; padding: 14px 25px; color: white; transition: 0.4s; 
        }
        .search-input-glass:focus { 
          background: rgba(255,255,255,0.1); border-color: ${sourceConfig[source].color}; outline: none; 
          box-shadow: 0 0 20px ${sourceConfig[source].color}33; 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="row g-5 justify-content-center">
        {/* 🔍 Left Side: Multi-Source Search Results */}
        <div className="col-md-7">
          <div className="mb-4">
            <h1 className="fw-bold mb-1 text-uppercase tracking-wider">Nexus <span style={{ color: sourceConfig[source].color }}>Jukebox</span></h1>
            <p className="text-muted small">Hub Status: {sourceConfig[source].name} Failover Active</p>
          </div>

          {/* 🔘 Provider Selector Chips */}
          <div className="d-flex gap-2 mb-4 flex-wrap">
            {Object.keys(sourceConfig).map(key => (
              <div 
                key={key} 
                className={`source-chip ${source === key ? 'active' : ''}`} 
                style={source === key ? { color: sourceConfig[key].color, borderColor: sourceConfig[key].color } : {}}
                onClick={() => setSource(key)}
              >
                {sourceConfig[key].icon} {sourceConfig[key].name}
              </div>
            ))}
          </div>

          <div className="position-relative mb-4">
            <input 
              type="text" 
              className="search-input-glass w-100 shadow-lg" 
              placeholder={`Find any track on ${sourceConfig[source].name}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button 
              onClick={handleSearch} 
              className="btn position-absolute end-0 top-50 translate-middle-y me-2"
              style={{ background: 'transparent', border: 'none', color: sourceConfig[source].color }}
            >
              🔍
            </button>
          </div>

          <div className="d-flex flex-column gap-2 no-scrollbar" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {isSearching ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: sourceConfig[source].color }} role="status"></div>
                <p className="mt-2 text-muted fw-bold">Querying {sourceConfig[source].name} Nodes...</p>
              </div>
            ) : results.length > 0 ? (
              results.map((song, i) => (
                <div key={i} className="glass-list-item p-3 d-flex align-items-center justify-content-between shadow-sm" onClick={() => handlePlay(song)}>
                  <div className="d-flex align-items-center gap-3">
                    <img 
                      src={song.cover || `https://placehold.co/100x100/000/fff?text=Music`} 
                      alt="thumbnail" 
                      style={{ width: '55px', height: '55px', borderRadius: '12px', objectFit: 'cover' }} 
                    />
                    <div style={{ maxWidth: '70%' }}>
                      <div className="fw-bold text-truncate">{song.title}</div>
                      <small className="text-muted">{song.artist}</small>
                    </div>
                  </div>
                  <div className="pe-2 fs-5" style={{ color: sourceConfig[source].color }}>{sourceConfig[source].icon}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 opacity-50">
                <div className="fs-1">🎶</div>
                <p className="mt-2">Nexus Nodes Idle. Search to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* 💿 Right Side: Now Playing Visualizer */}
        <div className="col-md-5">
          {currentLocalSong ? (
            <div 
              className="now-playing-glass p-5 text-center shadow-lg h-100 d-flex flex-column align-items-center justify-content-center"
              style={{ background: `${sourceConfig[source].color}08`, borderColor: `${sourceConfig[source].color}33` }}
            >
               <div className="vinyl-record mb-4 d-flex align-items-center justify-content-center">
                  <img 
                    src={currentLocalSong.cover || "https://placehold.co/200x200/000/fff?text=💿"} 
                    alt="spinning cover" 
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                  <div className="position-absolute translate-middle top-50 start-50 bg-dark rounded-circle border border-secondary" style={{ width: '40px', height: '40px' }}></div>
               </div>
               
               <h3 className="fw-bold mb-1 text-truncate w-100">{currentLocalSong.title}</h3>
               <p className="opacity-75 mb-4" style={{ color: sourceConfig[source].color }}>{currentLocalSong.artist}</p>
               
               <audio 
                 key={currentLocalSong.url}
                 src={currentLocalSong.url} 
                 controls 
                 autoPlay 
                 className="w-100" 
                 style={{ filter: 'invert(100%) brightness(1.5)' }}
               ></audio>
               
               <div 
                className="mt-4 badge rounded-pill bg-dark border px-4 py-2 opacity-75 tracking-widest"
                style={{ borderColor: sourceConfig[source].color, color: sourceConfig[source].color }}
               >
                  BRIDGE: {sourceConfig[source].name.toUpperCase()}
               </div>
            </div>
          ) : (
            <div className="now-playing-glass p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center border-dashed border-secondary">
              <div className="fs-1 mb-3">🎧</div>
              <h4 className="fw-bold">Waiting for Vibe...</h4>
              <p className="small px-4 text-white-50">Choose a platform above to bridge Nexus with global audio nodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Jukebox;