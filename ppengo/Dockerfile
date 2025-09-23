FROM node@sha256:8efd3ed25d83b4328df873ed9853a5bd97ffce8eb3498785e45c3e7297571f0e

ENV NODE_ENV=production
ENV HUSKY=0

WORKDIR /home/node/app

RUN --mount=type=cache,target=/var/cache/apt \
    echo 'Acquire::http { Proxy "http://172.17.0.1:3128"; };' > /etc/apt/apt.conf.d/01proxy \
    && apt update \
    && apt install --no-install-recommends -y yara libyara-dev \
    && npm install -g pnpm@latest-10 \
    && chown -R node:node /home/node \
    && rm -rf /var/lib/apt/lists/* /src/*.deb 

USER node
