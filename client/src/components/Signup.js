import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [creds, setCreds] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // 🚀 BYPASSING IMAGE UPLOAD FOR NOW
        // We will just send a default avatar URL
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";

        try {
            const response = await fetch("http://localhost:5001/api/auth/createuser", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...creds, avatar: defaultAvatar })
            });
            
            const json = await response.json();
            
            if (json.success) {
                localStorage.setItem('token', json.authToken);
                // Backend returns `username`, not `name`
                localStorage.setItem('username', json.username || creds.name);
                navigate("/"); // Redirect to Home
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
            <div className="card mx-auto p-4 shadow-lg" style={{ maxWidth: "400px", border: "1px solid #333" }}>
                <h2 className="text-center text-white mb-4">Join Nexus</h2>
                <form onSubmit={handleSubmit}>
                    {/* Image input removed for stability */}
                    <input type="text" className="form-control mb-3" placeholder="Name" onChange={(e)=>setCreds({...creds, name: e.target.value})} required />
                    <input type="email" className="form-control mb-3" placeholder="Email" onChange={(e)=>setCreds({...creds, email: e.target.value})} required />
                    <input type="password" className="form-control mb-3" placeholder="Password" onChange={(e)=>setCreds({...creds, password: e.target.value})} required />
                    <button className="btn btn-primary w-100" disabled={loading}>
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Signup;