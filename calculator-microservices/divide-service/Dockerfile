FROM node:20-alpine

WORKDIR /app

COPY calculator-microservices/divide-service/package*.json ./calculator-microservices/divide-service/
RUN cd calculator-microservices/divide-service && npm install

COPY calculator-microservices/divide-service ./calculator-microservices/divide-service
COPY shared ./shared

WORKDIR /app/calculator-microservices/divide-service

EXPOSE 8080

CMD ["npx", "nodemon", "divide_server.js"]