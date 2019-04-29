FROM node:alpine

WORKDIR /home/node

COPY app.js package.json ./

RUN echo http://dl-4.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
    && apk --no-cache add python make g++ yara \
    && chown -R node.node * \
    && su node -c yarn install \
    && apk del --purge g++ make python

USER node
