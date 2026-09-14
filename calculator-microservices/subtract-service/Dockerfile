FROM node:20-alpine

WORKDIR /app

COPY calculator-microservices/subtract-service/package*.json ./calculator-microservices/subtract-service/
RUN cd calculator-microservices/subtract-service && npm install

COPY calculator-microservices/subtract-service ./calculator-microservices/subtract-service
COPY shared ./shared

WORKDIR /app/calculator-microservices/subtract-service

EXPOSE 8080

CMD ["npx", "nodemon", "subtract_server.js"]