#!/bin/bash
# change app directory path run npm app api.luckyhand
cd  /home/ubuntu/api.luckyhand.io
sudo npm run build 
sudo pm2 reload "luckyHand-api"
sudo pm2 save