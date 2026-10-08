FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY schema.sql ./schema.sql

EXPOSE 8080
CMD ["npm", "start"]
