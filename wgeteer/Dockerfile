FROM node:latest

RUN apt-get update && \
    apt-get install -y chromium libatk-bridge2.0-0 libgtk-3-0 fonts-monapo \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

USER node

WORKDIR /home/node

COPY package.json ./

RUN yarn install
