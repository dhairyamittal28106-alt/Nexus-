import React, { useEffect, useState } from 'react';

const Admin = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const res = await fetch("http://localhost:5001/api/auth/getallusers");
            const data = await res.json();
            setUsers(data);
        };
        fetchUsers();
    }, []);

    const deleteUser = async (id) => {
        if(window.confirm("Ban this user?")) {
            await fetch(`http://localhost:5001/api/auth/deleteuser/${id}`, { method: 'DELETE' });
            setUsers(users.filter(user => user._id !== id));
        }
    }

    return (
        <div className="container mt-5 pt-5 text-white">
            <h2 className="mb-4 text-warning">🛡️ Admin Dashboard</h2>
            <div className="card">
                <div className="card-body">
                    <table className="table table-dark table-hover">
                        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        {user.role !== 'admin' && <button onClick={() => deleteUser(user._id)} className="btn btn-sm btn-outline-danger">Ban</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Admin;