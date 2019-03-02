FROM node:latest

#ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
#RUN chmod +x /usr/local/bin/dumb-init

RUN apt-get update && \
    apt-get install -y dumb-init chromium libatk-bridge2.0-0 libgtk-3-0 fonts-monapo \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

USER node

WORKDIR /home/node

COPY package.json ./

RUN yarn install

#ENTRYPOINT ["dumb-init", "--"]
