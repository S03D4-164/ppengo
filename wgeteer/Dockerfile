FROM node:latest

WORKDIR /var/www/app

RUN apt-get install -y chromium libatk-bridge2.0-0 libgtk-3-0 fonts-monapo

COPY package.json .

RUN yarn install

