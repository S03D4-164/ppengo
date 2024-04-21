FROM node:18

WORKDIR /home/node

COPY package.json ./

RUN apt-get update \
    && apt-get install --no-install-recommends -y dumb-init libxss1 chromium libatk-bridge2.0-0 libgtk-3-0 fonts-monapo telnet fonts-arphic-ukai fonts-arphic-uming fonts-unfonts-core xvfb \
    && chown -R node.node /home/node \
    && su node -c yarn install \
    && rm -rf /var/lib/apt/lists/* /src/*.deb \
    && dpkg -P --force-all chromium g++ gcc git

USER node
