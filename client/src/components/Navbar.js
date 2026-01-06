import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Monitor login status on every page change
    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('username');
        if (token) {
            setUser(name || 'Guest');
        } else {
            setUser(null);
        }
    }, [location]);

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        navigate('/login');
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (e.key === 'Enter' && value.trim().length > 0) {
            navigate('/search');
        }
    };

    return (
        <nav className="navbar navbar-expand-lg fixed-top px-3" style={{ background: 'rgba(9, 9, 11, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #27272a', zIndex: 1100 }}>
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold text-white d-flex align-items-center" to="/">
                    <span style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.5rem' }}>
                        NEXUS AI
                    </span>
                </Link>

                <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto align-items-center gap-2">
                        {user ? (
                            <>
                                <li className="nav-item me-2">
                                    <div className="position-relative">
                                        <input 
                                            type="text" 
                                            className="form-control form-control-sm border-0 ps-4" 
                                            placeholder="Search Friends..." 
                                            style={{ background: '#27272a', color: 'white', borderRadius: '20px', width: '180px' }}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleSearch}
                                        />
                                        <span className="position-absolute top-50 start-0 translate-middle-y ps-2" style={{ fontSize: '0.8rem', opacity: 0.5 }}>🔍</span>
                                    </div>
                                </li>

                                <li className="nav-item">
                                    <Link className={`nav-link px-3 ${location.pathname === '/chat' ? 'text-white fw-bold' : 'text-white-50'}`} to="/chat">Chat</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link px-3 ${location.pathname === '/reels' ? 'text-white fw-bold' : 'text-white-50'}`} to="/reels">Reels</Link>
                                </li>

                                {/* ✨ UPDATED: STUDIO TAB (Now White) */}
                                <li className="nav-item">
                                    <Link className={`nav-link px-3 ${location.pathname === '/studio' ? 'text-white fw-bold' : 'text-white-50'}`} to="/studio">Studio </Link>
                                </li>

                                {/* ✨ UPDATED: JUKEBOX TAB (Now White) */}
                                <li className="nav-item">
                                    <Link className={`nav-link px-3 ${location.pathname === '/jukebox' ? 'text-white fw-bold' : 'text-white-50'}`} to="/jukebox">Jukebox </Link>
                                </li>

                                <li className="nav-item ms-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="small" style={{ color: '#fff', fontWeight: '600' }}>@{user}</span>
                                        <button onClick={handleLogout} className="btn btn-sm btn-outline-danger rounded-pill px-3" style={{ fontSize: '0.75rem' }}>
                                            Logout
                                        </button>
                                    </div>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link text-white-50" to="/login">Login</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="btn btn-primary btn-sm rounded-pill px-4 ms-2" to="/signup" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)', border: 'none' }}>
                                        Join Squad
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;