# Nexus

Social-media prototype with React client and Express server. Client views include chat, camera, reels, search, and studio; server integrates MongoDB, Socket.IO, and Cloudinary.

    cd server
    npm install
    node index.js

In another terminal:

    cd client
    npm install
    npm start

Server listens on 5000; client typically on 3000. Configure your own database/media/AI credentials. Keep secrets private and review CORS/upload limits before deployment.
