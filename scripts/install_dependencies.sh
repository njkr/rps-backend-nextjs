#!/bin/bash
# CHANGE DIRECTORY TO APP ENV
cd /home/ec2-user/api.luckyhand.io
sudo apt-get install  nodejs -y
sudo npm i -g pm2
sudo npm i 
sudo npm install --legacy-peer-deps
#sudo npm install -g pm2 --legacy-peer-deps
#sudo npm install pm2 --force