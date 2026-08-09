@echo off

cd /d C:\Users\lenovo\AadiTech\Product\code\apps\web

echo npm run build
call npm run build

echo npx cap sync android
call npx cap sync android

echo npx cap run android
call npx cap run android