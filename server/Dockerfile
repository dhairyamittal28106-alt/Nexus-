# Use Node 20 for 2026 standards
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Your app binds to port 5001
EXPOSE 5001

# Start the server
CMD [ "node", "index.js" ]