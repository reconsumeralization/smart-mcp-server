# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install app dependencies
# Use a production install to avoid dev dependencies
RUN npm install

# Bundle app source
COPY . .

# Your app binds to port 3210, so you need to expose it
EXPOSE 3210

# Define the command to run your app
CMD ["npm", "start"] 