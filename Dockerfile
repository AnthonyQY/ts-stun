FROM node:22-slim

WORKDIR /usr/src/app

RUN npm install -g ts-node typescript @types/node

COPY server.ts .

RUN echo '{ "compilerOptions": { "module": "commonjs", "target": "ES2020", "types": ["node"] } }' > tsconfig.json

EXPOSE 3478/udp

CMD [ "ts-node", "server.ts" ]