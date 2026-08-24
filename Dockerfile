FROM node:20-slim

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application files
COPY . .

# Expose the standard port
EXPOSE 8080

# Start the Node.js server
CMD [ "npm", "start" ]
