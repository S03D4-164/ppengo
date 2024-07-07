FROM node:20@sha256:cb7cd40ba6483f37f791e1aace576df449fc5f75332c19ff59e2c6064797160e

ENV LANG ja_JP.UTF-8

WORKDIR /home/node

COPY package.json ./

ENV DBUS_SESSION_BUS_ADDRESS autolaunch:
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV HUSKY=0

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install --no-install-recommends -y dumb-init libxss1 telnet xvfb google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf dbus dbus-x11 \
    && chown -R node.node /home/node \
    && su node -c yarn install \
    && rm -rf /var/lib/apt/lists/* /src/*.deb \
    && dpkg -P --force-all chromium g++ gcc git

USER node
