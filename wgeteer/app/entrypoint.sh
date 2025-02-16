#!/bin/bash

#echo "starting X server and VNC display"
#rm -v -f /tmp/.X99-lock
#Xvfb :99 -ac -listen tcp -screen 0 1280x720x24 &
#sleep 1

#/usr/bin/fluxbox -display :99 -screen 0 > /dev/null 2>&1 &
#sleep 1

#x11vnc -display :99.0 -no6 -noipv6 -shared -forever -v -o /tmp/x11vnc.log &

echo "starting node server"
npm install --loglevel verbose --foreground-scripts && npm run pm2
