import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Chat from './components/Chat';
import Reels from './components/Reels';
import Search from './components/Search';


import Studio from './components/Studio';
import Jukebox from './components/Jukebox';

function App() {
  
  const [activeSong, setActiveSong] = useState(null);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/search" element={<Search />} />
        
         
         
        <Route path="/studio" element={<Studio />} />
        <Route path="/jukebox" element={<Jukebox setActiveSong={setActiveSong} />} />
      </Routes>

       
      {activeSong && (
        <div className="fixed-bottom bg-black border-top border-primary p-2 d-flex align-items-center justify-content-between px-4" style={{ zIndex: 2000, height: '70px' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
            <div className="text-white">
              <div className="small fw-bold">{activeSong.title}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{activeSong.artist}</div>
            </div>
          </div>
          <audio src={activeSong.url} controls autoPlay className="h-75"></audio>
          <button className="btn btn-sm text-white border-0" onClick={() => setActiveSong(null)}>✖</button>
        </div>
      )}
    </Router>
  );
}

export default App;