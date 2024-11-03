#!/bin/bash

echo "starting node server"
npm install --loglevel=verbose --foreground-scripts && npm run pm2
