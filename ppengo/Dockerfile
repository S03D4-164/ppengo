FROM node:alpine

WORKDIR /home/node

USER node

COPY app.js package.json ./

RUN yarn install
