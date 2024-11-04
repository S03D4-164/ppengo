FROM node:20-slim

ENV NODE_ENV production
ENV HUSKY=0

WORKDIR /home/node

COPY package.json ./

RUN --mount=type=cache,target=/var/cache/apt \
    echo 'Acquire::http { Proxy "http://172.17.0.1:3128"; };' > /etc/apt/apt.conf.d/01proxy \
    && apt update \
    && apt install --no-install-recommends -y yara libyara-dev \
    && chown -R node:node /home/node \
    && rm -rf /var/lib/apt/lists/* /src/*.deb 

USER node
