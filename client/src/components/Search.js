import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from "../config";
const Search = () => {
    const [query, setQuery] = useState("");
    const [searchType, setSearchType] = useState("people"); // people, songs, or filters
    const [results, setResults] = useState([]); 
    const [suggestions, setSuggestions] = useState([]); 
    const [pendingRequests, setPendingRequests] = useState([]); 
    const [friends, setFriends] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // ✨ MEDIA DATA (For Songs and Filters Search)
    const [songs] = useState([
        { title: "Midnight City", artist: "M83", type: "song" },
        { title: "Neon Lights", artist: "Nexus AI", type: "song" },
        { title: "Solar Wind", artist: "Astro", type: "song" }
    ]);

    const [studioFilters] = useState([
        { title: "Grayscale", type: "filter" },
        { title: "Sepia", type: "filter" },
        { title: "Neon Purple", type: "filter" },
        { title: "Retro Invert", type: "filter" }
    ]);

    const myId = localStorage.getItem('myId');
    const myUsername = localStorage.getItem('username') || "Guest";
    const navigate = useNavigate();

    useEffect(() => {
        if (myId) {
            fetchSuggestions();
            fetchPendingRequests();
            fetchFriends();
        }
    }, [myId]);

    const fetchPendingRequests = async () => {
        if (!myId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/pending-requests?myId=${myId}`);
            const data = await res.json();
            setPendingRequests(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Pending requests fail:', err); }
    };

    const fetchFriends = async () => {
        if (!myId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/friends-list?myId=${myId}`);
            const data = await res.json();
            setFriends(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Friends list fail:', err); }
    };

    const handleRequestAction = async (targetId, action) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/handle-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ myId, targetId, action })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Request ${action}ed!`);
                setPendingRequests(prev => prev.filter(req => req._id !== targetId));
                fetchFriends();
                fetchSuggestions();
            }
        } catch (err) { alert("Error handling request"); }
    };

    const fetchSuggestions = async () => {
        try {
            const url = myId 
                ? `${BACKEND_URL}/api/auth/suggestions?myId=${myId}`
                : `${BACKEND_URL}/api/auth/suggestions`;
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSuggestions(data.filter(user => user.name !== myUsername));
            }
        } catch (err) { setSuggestions([]); }
    };

    // ✨ UPDATED SEARCH LOGIC
    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);
        
        if (value.trim().length > 0) {
            if (searchType === "people") {
                setLoading(true);
                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/search?name=${encodeURIComponent(value.trim())}&myId=${myId}`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setResults(data.filter(user => user.name !== myUsername));
                    }
                } catch (err) { setResults([]); }
                setLoading(false);
            } else if (searchType === "songs") {
                setResults(songs.filter(s => s.title.toLowerCase().includes(value.toLowerCase())));
            } else if (searchType === "filters") {
                setResults(studioFilters.filter(f => f.title.toLowerCase().includes(value.toLowerCase())));
            }
        } else {
            setResults([]);
        }
    };

    const sendRequest = async (targetId, targetName) => {
        if (!myId) return alert("Session error");
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/add-friend/${targetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ myId })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Follow request sent to @${targetName}!`);
                setResults(prev => prev.filter(u => u._id !== targetId));
                setSuggestions(prev => prev.filter(u => u._id !== targetId));
            }
        } catch (err) { alert("Server error"); }
    };

    const startDM = (targetName) => navigate(`/chat?dm=${encodeURIComponent(targetName)}`);

    return (
        <div className="container mt-5 pt-5">
            {/* 🔔 PENDING REQUESTS PANEL */}
            {pendingRequests.length > 0 && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card p-4 shadow-lg" style={{ background: 'linear-gradient(45deg, #1e1b4b, #312e81)', border: '1px solid #4338ca', borderRadius: '20px' }}>
                            <h5 className="text-white mb-3">🔔 Pending Follow Requests ({pendingRequests.length})</h5>
                            <div className="d-flex flex-wrap gap-3">
                                {pendingRequests.map(req => (
                                    <div key={req._id} className="d-flex align-items-center gap-3 p-2 rounded-pill bg-dark border border-secondary shadow">
                                        <img src={req.avatar || `https://ui-avatars.com/api/?name=${req.name}`} alt="user" style={{ width: '35px', height: '35px', borderRadius: '50%', border: '1px solid #a855f7' }} />
                                        <span className="text-white fw-bold">@{req.name}</span>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-sm btn-success rounded-circle" onClick={() => handleRequestAction(req._id, 'accept')}>✓</button>
                                            <button className="btn btn-sm btn-danger rounded-circle" onClick={() => handleRequestAction(req._id, 'reject')}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                {/* 🔍 SEARCH COLUMN */}
                <div className="col-md-6 mb-4">
                    <div className="card p-4 shadow-lg" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                        
                        {/* Search Category Toggle */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="text-white mb-0">🔍 Global Search</h5>
                            <div className="btn-group btn-group-sm">
                                <button className={`btn btn-outline-info ${searchType === 'people' ? 'active' : ''}`} onClick={() => setSearchType('people')}>People</button>
                                <button className={`btn btn-outline-info ${searchType === 'songs' ? 'active' : ''}`} onClick={() => setSearchType('songs')}>Songs</button>
                                <button className={`btn btn-outline-info ${searchType === 'filters' ? 'active' : ''}`} onClick={() => setSearchType('filters')}>Filters</button>
                            </div>
                        </div>

                        <input 
                            type="text" 
                            className="form-control mb-3" 
                            style={{ background: '#27272a', color: 'white', border: 'none' }} 
                            placeholder={`Search ${searchType}...`}
                            value={query} 
                            onChange={handleSearch} 
                        />
                        
                        <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {loading ? <div className="text-muted">Searching Nexus...</div> : 
                             results.length > 0 ? results.map((item, idx) => (
                                <div key={item._id || idx} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: '#18181b', borderRadius: '8px', border: '1px solid #333' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                            {(item.name || item.title || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-white fw-bold">{item.name ? `@${item.name}` : item.title}</div>
                                            {item.artist && <small className="text-muted">{item.artist}</small>}
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {searchType === "people" ? (
                                            <>
                                                <button onClick={() => sendRequest(item._id, item.name)} className="btn btn-sm btn-primary">Follow</button>
                                                <button onClick={() => startDM(item.name)} className="btn btn-sm btn-outline-light">💬</button>
                                            </>
                                        ) : (
                                            <button onClick={() => navigate(searchType === "songs" ? "/jukebox" : "/studio")} className="btn btn-sm btn-info">Go to {searchType === "songs" ? "Player" : "Studio"}</button>
                                        )}
                                    </div>
                                </div>
                            )) : query.length > 0 && <div className="text-muted text-center">Nothing found for "{query}"</div>}
                        </div>
                    </div>
                </div>

                {/* 💡 SUGGESTIONS COLUMN */}
                <div className="col-md-6 mb-4">
                    <div className="card p-4 shadow-lg" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                        <h5 className="text-white mb-3">💡 Suggestions</h5>
                        {suggestions.length > 0 ? (
                            <div className="list-group">
                                {suggestions.map(user => (
                                    <div key={user._id} className="d-flex justify-content-between align-items-center p-3 mb-2" style={{ background: '#18181b', borderRadius: '12px', border: '1px solid #333' }}>
                                        <div className="d-flex align-items-center gap-3">
                                            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #a855f7' }} />
                                            <div className="text-white fw-bold">@{user.name}</div>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button onClick={() => sendRequest(user._id, user.name)} className="btn btn-sm btn-primary">Follow</button>
                                            <button onClick={() => startDM(user.name)} className="btn btn-sm btn-outline-light">💬</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted text-center">Finding new members for your squad...</div>
                        )}
                    </div>
                </div>
            </div>
          
            {/* 👫 FRIENDS LIST SECTION */}
            <div className="row mt-2">
                <div className="col-12">
                    <div className="card p-4 shadow-lg" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                        <h5 className="text-white mb-4">👫 Your Nexus Friends ({friends.length})</h5>
                        <div className="d-flex flex-wrap gap-4">
                            {friends.length === 0 ? (
                                <p className="text-muted w-100 text-center">No friends yet. Start following people to build your squad!</p>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend._id} className="text-center" style={{ width: '90px' }}>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img 
                                                src={friend.avatar || `https://ui-avatars.com/api/?name=${friend.name}`} 
                                                style={{ width: '65px', height: '65px', borderRadius: '50%', border: '2px solid #6366f1', cursor: 'pointer', objectFit: 'cover' }} 
                                                onClick={() => startDM(friend.name)} 
                                                alt="friend" 
                                            />
                                        </div>
                                        <div className="text-white small mt-2 fw-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            @{friend.name}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Search;