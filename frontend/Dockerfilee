# Use Node.js 14 as the base image
FROM node:14 as build

# Create a working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Build the React app for production
RUN npm run build

# Use a lightweight Nginx image as the final base image
FROM nginx:alpine

# Copy the built React app from the build stage to the Nginx web root directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 to the host
EXPOSE 80

# Command to start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]
