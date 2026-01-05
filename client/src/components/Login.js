import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [creds, setCreds] = useState({ email: "", password: "" });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch("http://localhost:5001/api/auth/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });
        const json = await response.json();
        if (json.success) {
            localStorage.setItem('token', json.authToken);
            // Backend returns `username`, not `name`
            localStorage.setItem('username', json.username);
            if (json.streak) {
                localStorage.setItem('streak', json.streak);
            }
            navigate("/");
        } else {
            alert("Invalid Credentials");
        }
    }

    return (
        <div className="container mt-5 pt-5">
            <div className="card mx-auto p-4" style={{ maxWidth: "400px" }}>
                <h2 className="text-center text-white mb-4">Login</h2>
                <form onSubmit={handleSubmit}>
                    <input type="email" className="form-control mb-3" placeholder="Email" value={creds.email} onChange={(e)=>setCreds({...creds, email: e.target.value})} />
                    <input type="password" className="form-control mb-3" placeholder="Password" value={creds.password} onChange={(e)=>setCreds({...creds, password: e.target.value})} />
                    <button className="btn btn-primary w-100">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;