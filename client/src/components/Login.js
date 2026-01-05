import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [creds, setCreds] = useState({ email: "", password: "" });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:5001/api/auth/login", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const json = await response.json();
            
            // ✨ DEBUG: Check this in your browser console
            console.log("Server Response:", json); 

            if (json.success) {
                // Save everything to storage
                localStorage.setItem('token', json.authToken);
                localStorage.setItem('username', json.username);
                localStorage.setItem('myId', json.myId); // ✨ CRITICAL LINE

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
            alert("Check if server is running on Port 5001");
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