FROM node:20-slim

#ENV LANG ja_JP.UTF-8
ENV NODE_ENV production
ENV DBUS_SESSION_BUS_ADDRESS autolaunch:
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV HUSKY=0

ADD app /home/node/app

WORKDIR /home/node/app

#EXPOSE 5900

RUN --mount=type=cache,target=/var/cache/apt \
    echo 'Acquire::http { Proxy "http://172.17.0.1:3128"; };' > /etc/apt/apt.conf.d/01proxy \
    && apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install --no-install-recommends -y libxss1 telnet xvfb google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf dbus dbus-x11 \
    && chown -R node:node /home/node \
    && rm -rf /var/lib/apt/lists/* /src/*.deb

USER node
