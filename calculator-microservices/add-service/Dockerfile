FROM node:20-alpine

WORKDIR /app

COPY calculator-microservices/add-service/package*.json ./calculator-microservices/add-service/
RUN cd calculator-microservices/add-service && npm install

COPY calculator-microservices/add-service ./calculator-microservices/add-service
COPY shared ./shared

WORKDIR /app/calculator-microservices/add-service

EXPOSE 8080

CMD ["npx", "nodemon", "add_server.js"]