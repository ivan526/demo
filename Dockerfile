FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p dist

ENV NODE_ENV=production
ENV PORT=3000
ENV VERSION=1.0.0

EXPOSE 3000

CMD ["node", "server.js"]
