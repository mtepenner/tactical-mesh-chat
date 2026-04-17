FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npx tsc --noEmit
