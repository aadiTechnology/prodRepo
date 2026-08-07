@echo off

cd /d C:\Users\lenovo\AadiTech\Product\AIContentStudio\code\Web

echo Pull latest
call git pull

echo Install packages
call npm install

echo Build React
call npm run build

echo Sync Capacitor
call npx cap sync

echo create build from android studio and 
pause

echo Build APK
cd android
call gradlew.bat assembleDebug

echo Install APK
adb install -r app\build\outputs\apk\debug\app-debug.apk

pause