import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from "../config";

const Login = () => {
    const [creds, setCreds] = useState({ email: "", password: "" });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // ✅ FIXED: Changed " " to ` ` so the BACKEND_URL variable actually works
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const json = await response.json();
            
            console.log("Server Response:", json); 

            if (json.success) {
                localStorage.setItem('token', json.authToken);
                localStorage.setItem('username', json.username);
                localStorage.setItem('myId', json.myId); 

                if (json.streak) {
                    localStorage.setItem('streak', json.streak);
                }
                
                alert("Login Successful! 🚀");
                navigate("/");
                window.location.reload(); 
            } else {
                alert(json.error || "Invalid Credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            // This alert triggers if the URL is wrong or server is down
            alert("Connection Error: Check your BACKEND_URL in config.js");
        }
    }

    return (
        <div className="container mt-5 pt-5">
            <div className="card mx-auto p-4 shadow-lg" style={{ maxWidth: "400px", background: '#18181b', border: "1px solid #333", borderRadius: '20px' }}>
                <h2 className="text-center text-white mb-4">Login</h2>
                <form onSubmit={handleSubmit}>
                    <input type="email" className="form-control mb-3" style={{ background: '#27272a', color: '#fff' }} placeholder="Email" value={creds.email} onChange={(e)=>setCreds({...creds, email: e.target.value})} required />
                    <input type="password" className="form-control mb-3" style={{ background: '#27272a', color: '#fff' }} placeholder="Password" value={creds.password} onChange={(e)=>setCreds({...creds, password: e.target.value})} required />
                    <button className="btn btn-primary w-100 fw-bold">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;