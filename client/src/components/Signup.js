import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [creds, setCreds] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";

        try {
            const response = await fetch("${BACKEND_URL}/api/auth/createuser", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...creds, avatar: defaultAvatar })
            });
            
            const json = await response.json();
            
            if (json.success) {
                localStorage.setItem('token', json.authToken);
                localStorage.setItem('username', json.username || creds.name);
                // ✨ FIX: Critical line added to allow Follow/Search to work
                localStorage.setItem('myId', json.myId); 
                navigate("/"); 
            } else {
                alert("Error: " + (json.error || "Invalid Credentials"));
            }
        } catch (error) {
            console.error(error);
            alert("Server Error. Check if Backend is running!");
        }
        setLoading(false);
    }

    return (
        <div className="container mt-5 pt-5">
            <div className="card mx-auto p-4 shadow-lg" style={{ maxWidth: "400px", background: '#18181b', border: "1px solid #333", borderRadius: '20px' }}>
                <h2 className="text-center text-white mb-4">Join Nexus</h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" className="form-control mb-3" placeholder="Name" style={{ background: '#27272a', color: '#fff', border: 'none' }} onChange={(e)=>setCreds({...creds, name: e.target.value})} required />
                    <input type="email" className="form-control mb-3" placeholder="Email" style={{ background: '#27272a', color: '#fff', border: 'none' }} onChange={(e)=>setCreds({...creds, email: e.target.value})} required />
                    <input type="password" className="form-control mb-3" placeholder="Password" style={{ background: '#27272a', color: '#fff', border: 'none' }} onChange={(e)=>setCreds({...creds, password: e.target.value})} required />
                    <button className="btn btn-primary w-100 fw-bold py-2" disabled={loading} style={{ background: 'linear-gradient(45deg, #6366f1, #a855f7)', border: 'none' }}>
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Signup;