import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="d-flex align-items-center justify-content-center text-center px-4" style={{ minHeight: "100vh" }}>
      <div className="card p-5 border-0" style={{ maxWidth: "800px", background: "transparent !important", boxShadow: "none !important" }}>
        <div className="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3 py-2 mb-4 border border-primary border-opacity-25">
          ✨ V1.0 Stable Release
        </div>
        <h1 className="display-2 fw-bold mb-3" style={{ letterSpacing: "-2px" }}>
          Connect with <span style={{ background: "linear-gradient(to right, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Intelligence.</span>
        </h1>
        <p className="lead text-secondary mb-5 fs-4 mx-auto" style={{ maxWidth: "600px" }}>
          The only social platform with a built-in Truth Engine, Dream Canvas, and Stealth communication.
        </p>
        <div className="d-flex flex-wrap justify-content-center gap-3">
          <Link to="/signup" className="btn btn-primary btn-lg px-5 py-3 shadow-lg">Start Building Your Squad</Link>
          <Link to="/chat" className="btn btn-outline-light btn-lg px-5 py-3" style={{ borderRadius: "14px" }}>Explore Features</Link>
        </div>
        
        <div className="mt-5 pt-5 d-flex justify-content-center gap-5 opacity-50">
           <small>🔒 Encrypted</small>
           <small>🤖 AI-Powered</small>
           <small>⚡ Real-time</small>
        </div>
      </div>
    </div>
  );
};

export default Home;