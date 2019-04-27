FROM node:alpine

WORKDIR /home/node

COPY app.js package.json ./

RUN echo http://dl-4.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
    && apk --no-cache add python make g++ yara \
    && chown -R node . \
    && su node \
    && yarn install \
    && exit \
    && apk del g++ make

USER node

#RUN yarn install
