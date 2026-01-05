import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Search = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]); 
    const [suggestions, setSuggestions] = useState([]); 
    const [pendingRequests, setPendingRequests] = useState([]); // ✨ Track incoming requests
    const [friends, setFriends] = useState([]); // ✨ Track accepted friends
    const [loading, setLoading] = useState(false);
    
    // ✨ IDENTITY SYNC
    const myId = localStorage.getItem('myId');
    const myUsername = localStorage.getItem('username') || "Guest";
    const navigate = useNavigate();

    // Load all data on mount
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
            // Fetch users who have sent YOU a follow request
            const res = await fetch(`http://localhost:5001/api/auth/pending-requests?myId=${myId}`);
            const data = await res.json();
            // Expecting array of populated User objects
            setPendingRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load pending requests:', err);
        }
    };

    const fetchFriends = async () => {
        if (!myId) return;
        try {
            const res = await fetch(`http://localhost:5001/api/auth/friends-list?myId=${myId}`);
            const data = await res.json();
            // Expecting array of populated User objects
            setFriends(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load friends list:', err);
        }
    };

    const handleRequestAction = async (targetId, action) => {
        try {
            const res = await fetch(`http://localhost:5001/api/auth/handle-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ myId, targetId, action }) // action is 'accept' or 'reject'
            });
            const data = await res.json();
            if (data.success) {
                alert(`Request ${action}ed successfully!`);
                
                // ✨ UI AUTO-REFRESH: Update local state immediately
                setPendingRequests(prev => prev.filter(req => req._id !== targetId));
                
                // Re-fetch lists to ensure data consistency
                fetchFriends();
                fetchSuggestions();
            }
        } catch (err) {
            alert("Error handling request");
        }
    };

    const fetchSuggestions = async () => {
        try {
            const url = myId 
                ? `http://localhost:5001/api/auth/suggestions?myId=${myId}`
                : `http://localhost:5001/api/auth/suggestions`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (Array.isArray(data)) {
                // Ensure current user is filtered out of suggestions
                setSuggestions(data.filter(user => user.name !== myUsername));
            }
        } catch (err) {
            console.error('Suggestion Error', err);
            setSuggestions([]);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);
        
        if (value.trim().length > 0) {
            setLoading(true);
            try {
                // Trim search value for matching reliability
                const res = await fetch(`http://localhost:5001/api/auth/search?name=${encodeURIComponent(value.trim())}&myId=${myId}`);
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    // Filter out yourself from search results
                    setResults(data.filter(user => user.name !== myUsername));
                } else {
                    setResults([]);
                }
            } catch (err) {
                setResults([]);
            }
            setLoading(false);
        } else {
            setResults([]);
        }
    };

    const sendRequest = async (targetId, targetName) => {
        const currentMyId = localStorage.getItem('myId');
        if (!currentMyId) {
            alert("Session error: Please log out and log back in to refresh your ID.");
            return;
        }

        try {
            const res = await fetch(`http://localhost:5001/api/auth/add-friend/${targetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ myId: currentMyId })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Follow request sent to @${targetName}! 🚀`);
                // UI Update: Remove from results/suggestions once followed
                setResults(prev => prev.filter(u => u._id !== targetId));
                setSuggestions(prev => prev.filter(u => u._id !== targetId));
            } else {
                alert(data.msg || "Action failed");
            }
        } catch (err) {
            alert("Error sending request. Check server connection.");
        }
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
                                        <img 
                                            src={req.avatar || `https://ui-avatars.com/api/?name=${req.name}`} 
                                            alt="user" 
                                            style={{ width: '35px', height: '35px', borderRadius: '50%', border: '1px solid #a855f7' }} 
                                        />
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
                {/* 🔍 SEARCH RESULTS COLUMN */}
                <div className="col-md-6 mb-4">
                    <div className="card p-4 shadow-lg" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                        <h5 className="text-white mb-3">🔍 Find Nexus Users</h5>
                        <input 
                            type="text" 
                            className="form-control mb-3" 
                            style={{ background: '#27272a', color: 'white', border: 'none' }} 
                            placeholder="Search your friends..." 
                            value={query} 
                            onChange={handleSearch} 
                        />
                        
                        <div className="list-group">
                            {loading ? <div className="text-muted">Searching Nexus...</div> : 
                             results.length > 0 ? results.map(user => (
                                <div key={user._id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: '#18181b', borderRadius: '8px', border: '1px solid #333' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="text-white fw-bold">@{user.name}</div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button onClick={() => sendRequest(user._id, user.name)} className="btn btn-sm btn-primary">Follow</button>
                                        <button onClick={() => startDM(user.name)} className="btn btn-sm btn-outline-light">💬</button>
                                    </div>
                                </div>
                            )) : query.length > 0 && <div className="text-muted text-center">User "{query}" not found.</div>}
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
                                            <img 
                                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
                                                alt={user.name} 
                                                style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #a855f7' }} 
                                            />
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