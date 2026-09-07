cd /d "C:\Users\lenovo\AadiTech\Product\code\apps\web"
@echo off

echo pull latest code
call git pull

echo install react packages
call npm i

echo Building React App...
call npm run build

echo Deploying to Azure...

call swa deploy ./dist --deployment-token fdec5f3952d3169d66294a3e11e9a367f86f91012a9262b50fe71fb227adf32607-0d0c8eea-05ae-41a7-8ccb-9a5db30e2f5c00014010a442b800 --env production

echo Deployment Completed
pause
