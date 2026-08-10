@echo off

cd /d C:\Users\lenovo\AadiTech\Product\code\apps\web

echo npm run cap:sync
call npm run cap:sync

echo npx cap run android
call npx cap run android