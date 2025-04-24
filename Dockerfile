FROM node:22-slim

WORKDIR /usr/src/app

RUN npm install -g ts-node typescript

COPY server.ts .

EXPOSE 3478/udp

CMD [ "ts-node", "server.ts" ]