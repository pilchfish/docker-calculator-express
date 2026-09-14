FROM node:20-alpine

WORKDIR /app

COPY calculator-microservices/gateway/package*.json ./gateway/

RUN cd gateway && npm install

COPY calculator-microservices/gateway/ ./gateway

WORKDIR /app/gateway

EXPOSE 8080

CMD ["npx", "nodemon", "gateway_server.js"]