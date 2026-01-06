import React, { useState, useEffect, useRef } from "react";
import { BACKEND_URL } from "../config";
function Jukebox({ setActiveSong }) {
  const [currentLocalSong, setCurrentLocalSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [source, setSource] = useState("yt");
  
  // 🔊 Scratch Sound Reference
  const scratchAudioRef = useRef(null);

  const sourceConfig = {
    yt: { 
      name: "YT Music", 
      color: "#FF0000", 
      icon: "🔴", 
      baseUrl: "https://music.youtube.com/search?q=" 
    },
    spotify: { 
      name: "Spotify", 
      color: "#1DB954", 
      icon: "🟢", 
      baseUrl: "https://open.spotify.com/search/" 
    },
    apple: { 
      name: "Apple Music", 
      color: "#946FC7", 
      icon: "🍎", 
      baseUrl: "https://music.apple.com/us/search?term=" 
    }
  };

  const activeConfig = sourceConfig[source] || sourceConfig["yt"];

  // ✨ MISSION: Record Scratch Logic
  const playScratch = () => {
    if (scratchAudioRef.current) {
      scratchAudioRef.current.currentTime = 0; // Reset to start
      scratchAudioRef.current.play().catch(e => console.log("Waiting for user interaction to play sound"));
    }
  };

  // Trigger scratch whenever the source (platform) is changed
  useEffect(() => {
    playScratch();
  }, [source]);

  const handleSearch = async (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (!searchQuery.trim()) return;
      
      const redirectUrl = activeConfig.baseUrl + encodeURIComponent(searchQuery);
      window.open(redirectUrl, "_blank");
      setTimeout(() => { window.focus(); }, 800);

      setIsSearching(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/music/search?q=${encodeURIComponent(searchQuery)}&source=${source}`);
        const data = await res.json();
        const musicResults = Array.isArray(data) ? data : [];
        setResults(musicResults);

        if (musicResults.length > 0) {
            handlePlay(musicResults[0]);
        }
      } catch (err) {
        console.error("Nexus Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handlePlay = (song) => {
    playScratch(); // Scratch when a new song is selected from the list
    setCurrentLocalSong(song);
    if (setActiveSong) setActiveSong(song); 
  };

  return (
    <div className="container mt-5 pt-5 min-vh-100" style={{ color: 'white' }}>
      
      {/* 📀 Hidden Audio element for the Scratch effect */}
      <audio 
        ref={scratchAudioRef} 
        src="https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-one/audio_hero_RecordScratch_DIGIJ02_57_311.mp3" 
        preload="auto" 
      />

      <style>{`
        .source-chip { padding: 8px 18px; border-radius: 100px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; font-size: 0.8rem; background: rgba(0,0,0,0.3); white-space: nowrap; }
        .source-chip.active { border-color: currentColor; background: rgba(255,255,255,0.1); font-weight: bold; box-shadow: 0 0 15px currentColor; }
        
        .glass-list-item { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 15px; transition: 0.3s; cursor: pointer; }
        .glass-list-item:hover { background: rgba(255, 255, 255, 0.08); transform: scale(1.02); border-color: ${activeConfig.color}; }
        
        /* 💿 ALWAYS-ON NEON VINYL STUDIO VISUALS */
        .vinyl-wrapper { position: relative; width: 220px; height: 220px; margin: 20px auto; }
        .neon-ring {
          position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
          border-radius: 50%; border: 3.5px solid ${activeConfig.color};
          box-shadow: 0 0 25px ${activeConfig.color}, inset 0 0 15px ${activeConfig.color};
          animation: pulseRing 1.5s infinite ease-in-out;
          z-index: 1;
        }
        .vinyl-record { 
          width: 100%; height: 100%; border-radius: 50%; 
          background: radial-gradient(circle, #333 10%, #111 40%, #000 100%); 
          border: 8px solid #222; animation: spinRecord 4s linear infinite; 
          box-shadow: 0 0 40px rgba(0,0,0,1); position: relative; z-index: 2; overflow: hidden;
        }
        .vinyl-record img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; opacity: 0.85; }
        
        @keyframes spinRecord { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.03); filter: brightness(1.5); } }
        
        /* 📊 ALWAYS-ON VOLUME SPIKES */
        .visualizer-container { display: flex; align-items: flex-end; gap: 5px; height: 50px; margin: 25px 0; justify-content: center; }
        .bar { width: 6px; background: ${activeConfig.color}; border-radius: 10px; animation: fakeSpike 0.5s infinite alternate ease-in-out; box-shadow: 0 0 10px ${activeConfig.color}77; }
        @keyframes fakeSpike { from { height: 10px; opacity: 0.4; } to { height: 45px; opacity: 1; } }
        
        .bar:nth-child(1) { animation-delay: 0.1s; } .bar:nth-child(2) { animation-delay: 0.3s; }
        .bar:nth-child(3) { animation-delay: 0.2s; } .bar:nth-child(4) { animation-delay: 0.4s; }
        .bar:nth-child(5) { animation-delay: 0.1s; } .bar:nth-child(6) { animation-delay: 0.5s; }

        .now-playing-glass { 
          background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(30px); 
          border-radius: 40px; border: 1px solid rgba(255, 255, 255, 0.1); 
          width: 100%; min-height: 480px; transition: 0.5s;
        }
        .search-input-glass { background: rgba(0,0,0,0.4); border: 1px solid ${activeConfig.color}77; border-radius: 100px; padding: 15px 30px; color: white; transition: 0.4s; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="row g-5 justify-content-center">
        <div className="col-md-7">
          <div className="mb-4">
            <h1 className="fw-bold mb-1 text-uppercase tracking-wider">Nexus <span style={{ color: activeConfig.color }}>Jukebox</span></h1>
          </div>

          <div className="d-flex gap-2 mb-4 flex-wrap">
            {Object.keys(sourceConfig).map(key => (
              <div key={key} className={`source-chip ${source === key ? 'active' : ''}`} 
                style={source === key ? { color: sourceConfig[key].color, borderColor: sourceConfig[key].color } : {}}
                onClick={() => setSource(key)}
              >
                {sourceConfig[key].icon} {sourceConfig[key].name}
              </div>
            ))}
          </div>

          <div className="position-relative mb-4">
            <input type="text" className="search-input-glass w-100 shadow-lg" placeholder={`Search on ${activeConfig.name}...`} 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
          </div>

          <div className="d-flex flex-column gap-2 no-scrollbar" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {isSearching ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: activeConfig.color }}></div></div>
            ) : results.map((song, i) => (
              <div key={i} className="glass-list-item p-3 d-flex align-items-center justify-content-between shadow-sm" onClick={() => handlePlay(song)}>
                <div className="d-flex align-items-center gap-3">
                  <img src={song.cover} alt="cover" style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} />
                  <div className="fw-bold text-truncate" style={{ maxWidth: '280px' }}>{song.title}</div>
                </div>
                <div style={{ color: activeConfig.color }}>▶</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-5">
          <div className="now-playing-glass p-5 text-center shadow-lg d-flex flex-column align-items-center justify-content-center"
            style={{ borderColor: currentLocalSong ? `${activeConfig.color}77` : 'rgba(255,255,255,0.1)' }}>
            
            <div className="vinyl-wrapper">
               <div className="neon-ring"></div>
               <div className="vinyl-record">
                 <img src={currentLocalSong ? currentLocalSong.cover : "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400"} alt="spinning" />
                 <div className="position-absolute translate-middle top-50 start-50 bg-dark rounded-circle border border-secondary" style={{ width: '40px', height: '40px', zIndex: 5 }}></div>
               </div>
            </div>
            
            <h3 className="fw-bold mb-1 text-truncate w-100">
                {currentLocalSong ? currentLocalSong.title : "Studio Active"}
            </h3>
            <p className="opacity-75 mb-1" style={{ color: activeConfig.color }}>
                {currentLocalSong ? currentLocalSong.artist : "NEXUS HI-FI"}
            </p>
            
            <div className="visualizer-container">
               {[...Array(6)].map((_, i) => <div key={i} className="bar"></div>)}
            </div>

            {currentLocalSong && (
                <audio key={currentLocalSong.url} src={currentLocalSong.url} controls autoPlay className="w-100 mt-2" style={{ filter: 'invert(100%) brightness(1.5)' }}></audio>
            )}
            
            <div className="mt-4 badge rounded-pill bg-dark border px-4 py-2 opacity-75 tracking-widest" style={{ borderColor: activeConfig.color, color: activeConfig.color }}>
               {currentLocalSong ? `SOURCE: ${activeConfig.name.toUpperCase()}` : "READY TO SYNC"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Jukebox;