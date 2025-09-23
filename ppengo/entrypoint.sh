#!/bin/bash

echo "starting node server"
pnpm install --loglevel=verbose && pnpm run pm2
