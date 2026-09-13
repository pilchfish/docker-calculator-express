FROM node:20-alpine

WORKDIR /app

COPY calculator-microservices/multiply-service/package*.json ./calculator-microservices/multiply-service/
RUN cd calculator-microservices/multiply-service && npm install

COPY calculator-microservices/multiply-service ./calculator-microservices/multiply-service
COPY shared ./shared

WORKDIR /app/calculator-microservices/multiply-service

EXPOSE 8080

CMD ["node", "multiply_server.js"]