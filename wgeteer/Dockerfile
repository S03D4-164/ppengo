FROM node:latest

WORKDIR /home/node

COPY package.json ./

RUN apt-get update \
    && apt-get install --no-install-recommends -y dumb-init chromium libatk-bridge2.0-0 libgtk-3-0 fonts-monapo \
    && chown -R node.node /home/node \
    && su node -c yarn install \
    && rm -rf /var/lib/apt/lists/* /src/*.deb \
    && dpkg -P --force-all chromium g++ gcc git cpp

USER node
