# Nexus

Nexus is a social-media application prototype with a React client and Express server. The client includes authentication, chat, camera, reels, search, and studio views. Server routes support posts, messages, authentication, and AI features, with MongoDB, Socket.IO, and Cloudinary integrations.

## Requirements

- Node.js and npm
- MongoDB
- Cloudinary credentials for media uploads
- Provider credentials for any AI feature you use

## Run locally

Start the API in one terminal:

    cd server
    npm install
    node index.js

Start the client in another terminal:

    cd client
    npm install
    npm start

The server listens on port 5000; the client typically opens at `http://localhost:3000`. Configure your own database and provider credentials before running. Keep secrets out of source control and review CORS and upload limits before deployment.

## Structure

- `client/`: React application
- `server/index.js`: Express and Socket.IO server
- `server/routes/`: auth, AI, messaging, and posts
- `server/models/`: users, messages, and posts
