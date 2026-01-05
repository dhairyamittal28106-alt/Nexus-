import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Search = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const myId = localStorage.getItem('myId');
    const navigate = useNavigate();

    // Load suggestions on mount
    useEffect(() => {
        if (myId) {
            fetchSuggestions();
        }
    }, [myId]);

    const fetchSuggestions = async () => {
        if (!myId) return;
        try {
            const res = await fetch(`http://localhost:5001/api/auth/suggestions?myId=${myId}`);
            const data = await res.json();
            setSuggestions(data || []);
        } catch (err) {
            console.error('Failed to load suggestions:', err);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);
        if (value.length > 2) {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:5001/api/auth/search?name=${value}`);
                const data = await res.json();
                setResults(data);
            } catch (err) {
                console.error('Search failed:', err);
            }
            setLoading(false);
        } else {
            setResults([]);
        }
    };

    const sendRequest = async (targetId, targetName) => {
        if (!myId) {
            alert("Please login first");
            return;
        }
        try {
            const res = await fetch(`http://localhost:5001/api/auth/add-friend/${targetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ myId })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Follow request sent to @${targetName}! 🚀`);
                // Remove from suggestions after sending request
                setSuggestions(prev => prev.filter(u => u._id !== targetId));
            } else {
                alert(data.msg || "Request already sent");
            }
        } catch (err) {
            alert("Failed to send request");
        }
    };

    const startDM = (targetName) => {
        navigate(`/chat?dm=${encodeURIComponent(targetName)}`);
    };

    const startCall = (targetName, mode = 'video') => {
        const dmId = ["DM", localStorage.getItem('username'), targetName].sort().join("_");
        const callUrl = `https://meet.jit.si/NEXUS-${mode}-${encodeURIComponent(dmId)}`;
        window.open(callUrl, "_blank");
    };

    return (
        <div className="container mt-5 pt-5">
            <div className="row">
                {/* Search Section */}
                <div className="col-md-6 mb-4">
                    <div className="card p-4" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h5 className="text-white mb-3">🔍 Search People</h5>
                        <input 
                            type="text" 
                            className="form-control mb-3" 
                            style={{ background: '#27272a', color: 'white', border: 'none' }}
                            placeholder="Search users (e.g. Dhairya)..." 
                            value={query}
                            onChange={handleSearch}
                        />
                        {loading && <div className="text-muted">Searching...</div>}
                        <div className="list-group">
                            {results.map(user => (
                                <div key={user._id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: '#18181b', borderRadius: '8px' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-white fw-bold">@{user.name}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => sendRequest(user._id, user.name)} className="btn btn-sm btn-primary">Follow</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Suggestions Section (Instagram-style) */}
                <div className="col-md-6 mb-4">
                    <div className="card p-4" style={{ background: 'rgba(18, 18, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h5 className="text-white mb-3">💡 Suggestions for You</h5>
                        {suggestions.length === 0 ? (
                            <div className="text-muted">No suggestions available. Try searching for users!</div>
                        ) : (
                            <div>
                                {suggestions.map(user => (
                                    <div key={user._id} className="d-flex justify-content-between align-items-center p-3 mb-2" style={{ background: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="d-flex align-items-center gap-3" style={{ flex: 1 }}>
                                            <img 
                                                src={user.avatar} 
                                                alt={user.name}
                                                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #a855f7' }}
                                                onError={(e) => {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=a855f7&color=fff`;
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div className="text-white fw-bold">@{user.name}</div>
                                                {user.mutualFriends > 0 && (
                                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                        {user.mutualFriends} mutual {user.mutualFriends === 1 ? 'friend' : 'friends'}
                                                    </div>
                                                )}
                                                {user.followersCount > 0 && (
                                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {user.followersCount} followers
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button 
                                                onClick={() => sendRequest(user._id, user.name)} 
                                                className="btn btn-sm btn-primary"
                                                style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)', border: 'none' }}
                                            >
                                                Follow
                                            </button>
                                            <button 
                                                onClick={() => startDM(user.name)} 
                                                className="btn btn-sm btn-outline-light"
                                                title="Message"
                                            >
                                                💬
                                            </button>
                                            <button 
                                                onClick={() => startCall(user.name, 'video')} 
                                                className="btn btn-sm btn-outline-light"
                                                title="Video Call"
                                            >
                                                📹
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Search;