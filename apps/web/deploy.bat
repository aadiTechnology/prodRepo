cd /d "C:\Users\lenovo\AadiTech\Product\AIContentStudio\code\Web"
@echo off

echo pull latest code
call git pull

echo Building React App...
call npm run build

echo Deploying to Azure...

call swa deploy ./dist --deployment-token be4086cf1f16c317959c2d9bc3e6efe3cc31ae281633b2a95d340c35bbb04f1007-1b32b296-58ed-4757-af32-5209b73b988501016000005a6010 --env production

echo Deployment Completed
pause