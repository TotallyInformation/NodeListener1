#!/bin/bash
# @see: http://y-ax.com/nodejs-app-auto-start-in-server
# Called from /etc/rc.local:
#     su - pi -c 'screen -d -m -S ardlistener1 /home/pi/node/NodeListener1/start.sh'
# Can connect to the screen via:
#     screen -r ardlistener1

cd /home/pi/node/NodeListener1
supervisor server.js
