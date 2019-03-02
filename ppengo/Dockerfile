FROM node:alpine

#WORKDIR /var/www/app

WORKDIR /home/node

USER node

COPY app.js package.json ./

RUN yarn install
