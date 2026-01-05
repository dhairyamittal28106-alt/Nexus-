import React, { useState, useEffect, useRef } from 'react';

const Reels = () => {
    // --- State Management ---
    const [posts, setPosts] = useState([]); 
    const [showUpload, setShowUpload] = useState(false);
    const [showComments, setShowComments] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [caption, setCaption] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileType, setFileType] = useState(""); 
    const [uploadProgress, setUploadProgress] = useState(0); 
    const [downloadProgress, setDownloadProgress] = useState(null); 
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false); 
    const [isMuted, setIsMuted] = useState(true); 
    const [showHeart, setShowHeart] = useState(null); // Animation state
    const [reelsWatched, setReelsWatched] = useState(0);
    
    // --- Profile & Theme States ---
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('nexus_theme');
        return savedTheme ? JSON.parse(savedTheme) : true;
    });

    const [username, setUsername] = useState(() => localStorage.getItem('username') || "Dhairya");
    const [profilePic, setProfilePic] = useState(() => localStorage.getItem('profile_pic') || "");
    const [tempUsername, setTempUsername] = useState(username);

    const [localAIStorage, setLocalAIStorage] = useState(() => {
        const saved = localStorage.getItem('nexus_ai_cache');
        return saved ? JSON.parse(saved) : { likes: {}, comments: {} };
    });

    const containerRef = useRef(null);

    // --- LocalStorage Sync ---
    useEffect(() => {
        localStorage.setItem('nexus_ai_cache', JSON.stringify(localAIStorage));
    }, [localAIStorage]);

    useEffect(() => {
        localStorage.setItem('nexus_theme', JSON.stringify(isDarkMode));
        localStorage.setItem('username', username);
        localStorage.setItem('profile_pic', profilePic);
    }, [isDarkMode, username, profilePic]);

    const theme = {
        bg: isDarkMode ? '#000' : '#f8f9fa',
        text: isDarkMode ? '#fff' : '#000',
        card: isDarkMode ? '#18181b' : '#ffffff',
        accent: '#a855f7',
        border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        sidebarBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    };

    const fetchReels = async () => {
        try {
            const res = await fetch("http://localhost:5001/api/posts/feed");
            const data = await res.json();
            if (Array.isArray(data)) {
                const merged = data.map(post => {
                    if (post._id.startsWith("ai_")) {
                        return {
                            ...post,
                            likes: localAIStorage.likes[post._id] || post.likes,
                            comments: localAIStorage.comments[post._id] || post.comments
                        };
                    }
                    return post;
                });
                setPosts(merged);
            }
        } catch (err) { console.error("Sync Error", err); }
    };

    useEffect(() => {
        fetchReels();
        const interval = setInterval(fetchReels, 15000); 
        return () => clearInterval(interval);
    }, [localAIStorage]);

    // --- Media Handlers ---
    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "eza5p19e");
        formData.append("resource_type", "image");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dguu2gtb1/image/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            setProfilePic(data.secure_url);
        } catch (err) { console.error("Avatar error", err); }
    };

    const handleDownload = async (fileUrl, fileName) => {
        setDownloadProgress(0);
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', fileUrl, true);
            xhr.responseType = 'blob';
            xhr.onprogress = (e) => { if (e.lengthComputable) setDownloadProgress(Math.round((e.loaded / e.total) * 100)); };
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const url = window.URL.createObjectURL(xhr.response);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', fileName || 'nexus_reel.mp4');
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);
                    setTimeout(() => setDownloadProgress(null), 2000);
                }
            };
            xhr.send();
        } catch (error) { setDownloadProgress(null); }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 2000 * 1024 * 1024) {
            setFileType(file.type);
            setSelectedFile(file);
        } else if (file) { alert("Max size 2000MB"); }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("upload_preset", "eza5p19e");
            // Use auto so both images and videos work
            formData.append("resource_type", "auto");

            const cloudRes = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "https://api.cloudinary.com/v1_1/dguu2gtb1/auto/upload"); 
                xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
                xhr.onload = () => resolve(JSON.parse(xhr.responseText));
                xhr.onerror = () => reject("Cloudinary Upload Failed");
                xhr.send(formData);
            });

            if (!cloudRes.secure_url) {
                console.error("Cloudinary upload response missing secure_url:", cloudRes);
                alert("Cloud upload failed. Please try again with a different file.");
                setIsUploading(false);
                return;
            }

            const dbRes = await fetch("http://localhost:5001/api/posts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: username, caption, fileUrl: cloudRes.secure_url, contentType: fileType })
            });

            if (dbRes.ok) {
                const newPost = await dbRes.json();
                setPosts(prev => [newPost, ...prev]);
                setUploadSuccess(true);
                setTimeout(() => {
                    setIsUploading(false); setShowUpload(false); setUploadProgress(0);
                    setSelectedFile(null); setCaption(""); setUploadSuccess(false);
                    if (containerRef.current) {
                        containerRef.current.scrollTo(0, 0);
                    }
                }, 1500);
            } else {
                const errorPayload = await dbRes.json().catch(() => ({}));
                console.error('Create post failed:', errorPayload);
                alert(errorPayload.error || 'Failed to save reel. Please try again.');
                setIsUploading(false);
            }
        } catch (err) { 
            console.error('Upload error:', err);
            setIsUploading(false); 
        }
    };

    // --- Interaction Handlers ---
    const handleLike = async (post, source = "button") => {
        // Trigger heart animation for double tap
        if (source === "doubleTap") {
            setShowHeart(post._id);
            setTimeout(() => setShowHeart(null), 1000);
        }

        if (post._id.startsWith("ai_")) {
            const currentLikes = localAIStorage.likes[post._id] || post.likes;
            const newLikes = currentLikes.includes(username) ? currentLikes.filter(u => u !== username) : [...currentLikes, username];
            setLocalAIStorage(prev => ({ ...prev, likes: { ...prev.likes, [post._id]: newLikes } }));
        }
        await fetch(`http://localhost:5001/api/posts/like/${post._id}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        if (!post._id.startsWith("ai_")) fetchReels();
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !showComments) return;
        const targetId = showComments;
        if (targetId.startsWith("ai_")) {
            const currentComments = localAIStorage.comments[targetId] || [];
            setLocalAIStorage(prev => ({ ...prev, comments: { ...prev.comments, [targetId]: [...currentComments, { username, text: newComment, timestamp: new Date() }] } }));
        }
        await fetch(`http://localhost:5001/api/posts/comment/${targetId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, text: newComment })
        });
        setNewComment(""); if (!targetId.startsWith("ai_")) fetchReels();
    };

    const handleDelete = async (postId) => {
        if (window.confirm("Delete this reel?")) {
            await fetch(`http://localhost:5001/api/posts/delete/${postId}`, { method: 'DELETE' });
            fetchReels();
        }
    };

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, clientHeight } = containerRef.current;
        const index = Math.round(scrollTop / clientHeight);
        if (index > reelsWatched - 1) setReelsWatched(index + 1);
    };

    return (
        <div style={{ backgroundColor: theme.bg, height: '100vh', position: 'relative', overflow: 'hidden', transition: '0.3s' }}>
            
            {/* ✨ FIXED TOP NAVIGATION */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: theme.accent, margin: 0, fontWeight: 'bold', letterSpacing: '1px' }}>NEXUS AI</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>@{username}</span>
                        {profilePic && (
                            <img src={profilePic} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.accent}` }} alt="me" />
                        )}
                    </div>
                    <button style={{ background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '5px 15px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            {/* Download Progress Overlay */}
            {downloadProgress !== null && (
                <div style={{ position: 'fixed', top: '75px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: theme.accent, color: 'white', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}>
                    📥 Saving to disk: {downloadProgress}%
                </div>
            )}

            {/* SIDEBAR POSITION (80px from top) */}
            <div style={{ position: 'fixed', top: '80px', left: '20px', zIndex: 100, background: theme.sidebarBg, backdropFilter: 'blur(15px)', padding: '15px', borderRadius: '20px', color: theme.text, border: `1px solid ${theme.border}`, width: '180px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 10px', overflow: 'hidden', borderRadius: '50%', border: `2px solid ${theme.accent}` }}>
                    <img src={profilePic || 'https://via.placeholder.com/60'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>@{username}</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>DAILY PROGRESS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.accent }}>{reelsWatched}</div>
            </div>

            <div ref={containerRef} onScroll={handleScroll} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                {posts.map((post, index) => (
                    <div key={`${post._id}-${index}`} style={{ height: '100vh', scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        
                        <div 
                            onDoubleClick={() => handleLike(post, "doubleTap")}
                            style={{ width: 'auto', height: '100%', aspectRatio: '9/16', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                        >
                            {(post.fileUrl.includes("video") || (post.contentType && post.contentType.includes("video"))) ? (
                                <video src={post.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} autoPlay muted={isMuted} loop playsInline />
                            ) : (
                                <img src={post.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Nexus Reel" />
                            )}
                            
                            {/* ✨ LIKE ANIMATION */}
                            {showHeart === post._id && (
                                <div className="heart-animation" style={{ position: 'absolute', zIndex: 10, fontSize: '100px', pointerEvents: 'none' }}>❤️</div>
                            )}

                            <div onClick={() => setIsMuted(!isMuted)} style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'white', zIndex: 10 }}>{isMuted ? '🔇' : '🔊'}</div>
                        </div>

                        {/* Controls Sidebar */}
                        <div style={{ position: 'absolute', bottom: '120px', right: '20px', display: 'flex', flexDirection: 'column', gap: '25px', zIndex: 50, alignItems: 'center' }}>
                            <div onClick={() => setShowSettings(true)} style={{ cursor: 'pointer', background: theme.sidebarBg, padding: '10px', borderRadius: '50%', border: `1px solid ${theme.border}`, color: theme.text }}><div style={{ fontSize: '24px' }}>⚙️</div></div>
                            <div onClick={() => handleDownload(post.fileUrl, `nexus_${post._id}.mp4`)} style={{ cursor: 'pointer', color: theme.text }}><div style={{ fontSize: '32px' }}>📥</div></div>
                            {post.user === username && !post._id.startsWith("ai_") && <div onClick={() => handleDelete(post._id)} style={{ cursor: 'pointer', fontSize: '28px', color: theme.text }}>🗑️</div>}
                            <div onClick={() => handleLike(post)} style={{ textAlign: 'center', cursor: 'pointer' }}><div style={{ fontSize: '32px' }}>{post.likes?.includes(username) ? '❤️' : '🤍'}</div><span style={{ color: 'white', fontWeight: 'bold' }}>{post.likes?.length || 0}</span></div>
                            <div onClick={() => setShowComments(post._id)} style={{ textAlign: 'center', cursor: 'pointer' }}><div style={{ fontSize: '32px' }}>💬</div><span style={{ color: 'white', fontWeight: 'bold' }}>{post.comments?.length || 0}</span></div>
                            <div onClick={() => { navigator.clipboard.writeText(post.fileUrl); alert("Copied!"); }} style={{ fontSize: '32px', color: theme.text, cursor: 'pointer' }}>✈️</div>
                        </div>

                        <div style={{ position: 'absolute', bottom: '120px', left: '20px', maxWidth: '75%', textShadow: '2px 2px 10px black', pointerEvents: 'none' }}>
                            <h6 style={{ color: 'white', fontWeight: 'bold' }}>@{post.user}</h6>
                            <p style={{ color: '#fff', fontSize: '0.95rem' }}>{post.caption}</p>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={() => setShowUpload(true)} style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 999, width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #bc1888)', border: 'none', color: 'white', fontSize: '30px', cursor: 'pointer' }}>+</button>

            {/* Profile Settings Modal */}
            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, background: theme.bg, zIndex: 10001, padding: '40px', color: theme.text, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px' }}>
                        <h2>Profile Settings</h2>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`btn ${isDarkMode ? 'btn-light' : 'btn-dark'}`}>{isDarkMode ? '☀️' : '🌙'}</button>
                            <button onClick={() => setShowSettings(false)} className="btn btn-danger">✕ Close</button>
                        </div>
                    </div>

                    <div style={{ background: theme.sidebarBg, padding: '25px', borderRadius: '20px', marginBottom: '30px', border: `1px solid ${theme.border}` }}>
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: `4px solid ${theme.accent}` }}>
                                    <img src={profilePic || 'https://via.placeholder.com/120'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                                </div>
                                <input type="file" onChange={handleProfilePicChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                <div style={{ fontSize: '10px', marginTop: '8px', textAlign: 'center', opacity: 0.7 }}>Tap to change picture</div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ fontSize: '12px', opacity: 0.7 }}>Username</label>
                                <div className="d-flex gap-2">
                                    <input className="form-control" style={{ background: isDarkMode ? '#222' : '#eee', color: theme.text, border: 'none' }} value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} />
                                    <button className="btn" style={{ background: theme.accent, color: 'white' }} onClick={() => setUsername(tempUsername)}>Update</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity: liked & commented reels */}
                    <div style={{ background: theme.sidebarBg, padding: '20px', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                        <h5 style={{ marginBottom: '15px' }}>Your Activity</h5>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <h6 style={{ fontSize: '13px', opacity: 0.8 }}>Liked Reels</h6>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '12px' }}>
                                    {posts.filter(p => p.likes?.includes(username)).length === 0 ? (
                                        <div style={{ opacity: 0.6 }}>No likes yet.</div>
                                    ) : (
                                        posts
                                            .filter(p => p.likes?.includes(username))
                                            .map(p => (
                                                <div key={p._id} className="mb-2">
                                                    <span style={{ color: theme.accent }}>@{p.user}</span>{' '}
                                                    <span>- {p.caption || 'No caption'}</span>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                            <div className="col-md-6 mb-3">
                                <h6 style={{ fontSize: '13px', opacity: 0.8 }}>Commented Reels</h6>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '12px' }}>
                                    {posts.filter(p => p.comments?.some(c => c.username === username)).length === 0 ? (
                                        <div style={{ opacity: 0.6 }}>No comments yet.</div>
                                    ) : (
                                        posts
                                            .filter(p => p.comments?.some(c => c.username === username))
                                            .map(p => (
                                                <div key={p._id} className="mb-2">
                                                    <span style={{ color: theme.accent }}>@{p.user}</span>{' '}
                                                    <span>- {p.caption || 'No caption'}</span>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '380px', background: theme.card, padding: '30px', borderRadius: '20px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                        {uploadSuccess ? (
                            <div style={{ animation: 'pop 0.5s ease-out' }}>
                                <div style={{ fontSize: '60px' }}>✅</div>
                                <h5 className="text-white mt-3">Post Live!</h5>
                            </div>
                        ) : (
                            <>
                                <h5 className="text-white mb-4">New Reel</h5>
                                <input type="file" className="form-control mb-3" style={{ background: '#222', color: 'white', border: 'none' }} onChange={handleFileChange} disabled={isUploading} />
                                <textarea className="form-control mb-4" style={{ background: '#222', color: 'white', border: 'none', minHeight: '80px' }} placeholder="Caption..." value={caption} onChange={(e)=>setCaption(e.target.value)} disabled={isUploading} />
                                {isUploading && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ color: theme.accent, fontSize: '12px' }}>Cloud Upload: {uploadProgress}%</div>
                                        <div style={{ width: '100%', background: '#333', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
                                            <div style={{ width: `${uploadProgress}%`, background: theme.accent, height: '100%', transition: '0.3s' }} />
                                        </div>
                                    </div>
                                )}
                                <button onClick={handleUpload} className="btn w-100 mb-2" style={{ background: theme.accent, color: 'white' }} disabled={isUploading || !selectedFile}>{isUploading ? "Processing..." : "Share Reel"}</button>
                                {!isUploading && <button onClick={() => setShowUpload(false)} className="btn btn-secondary w-100">Cancel</button>}
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {/* Comment Drawer */}
            {showComments && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '55vh', background: theme.card, zIndex: 5000, padding: '25px', borderTop: `1px solid ${theme.border}`, borderTopLeftRadius: '25px', borderTopRightRadius: '25px', color: theme.text }}>
                    <div className="d-flex justify-content-between mb-3"><h6>Comments</h6><button onClick={() => setShowComments(null)} style={{ color: '#ff4d4d', background: 'none', border: 'none' }}>✕</button></div>
                    <div style={{ overflowY: 'auto', height: '30vh', marginBottom: '20px' }}>
                        {posts.find(p => p._id === showComments)?.comments?.map((c, i) => (
                            <div key={i} className="mb-3"><span style={{ color: theme.accent, fontWeight: 'bold' }}>@{c.username}:</span> {c.text}</div>
                        ))}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="d-flex gap-2">
                        <input className="form-control" style={{ background: isDarkMode ? '#222' : '#eee', color: theme.text, border: 'none' }} value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Say something..." />
                        <button className="btn" style={{ background: theme.accent, color: 'white' }}>Send</button>
                    </form>
                </div>
            )}
            
            {/* ✨ HEART ANIMATION STYLES */}
            <style>{`
                @keyframes heartPop {
                    0% { transform: scale(0); opacity: 0; }
                    15% { transform: scale(1.2); opacity: 1; }
                    30% { transform: scale(1); opacity: 1; }
                    80% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                .heart-animation {
                    animation: heartPop 1s ease-out forwards;
                }
                @keyframes pop { 
                    0% { transform: scale(0); opacity: 0; } 
                    50% { transform: scale(1.6); opacity: 1; } 
                    100% { transform: scale(1); opacity: 0; } 
                }
            `}</style>
        </div>
    );
};

export default Reels;