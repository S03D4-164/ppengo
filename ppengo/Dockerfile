FROM node:20-slim

WORKDIR /home/node

ENV HUSKY=0

COPY package.json ./

RUN apt-get update \
    && apt-get install --no-install-recommends -y dumb-init yara libyara-dev \
    && chown -R node:node /home/node \
    && su node -c yarn install \
    && rm -rf /var/lib/apt/lists/* /src/*.deb 
USER node
