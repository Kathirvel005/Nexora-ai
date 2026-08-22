FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build Next.js application
COPY . .
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start Next.js production server
CMD ["npm", "run", "start"]
