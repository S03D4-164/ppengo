FROM node:lts-alpine

WORKDIR /home/node

COPY package.json ./

RUN echo http://dl-4.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
    && apk --no-cache add python make g++ yara \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    bash \
    imagemagick \
    && chown -R node.node * \
    && su node -c yarn install \
    && apk del --purge build-base g++ make python

USER node
