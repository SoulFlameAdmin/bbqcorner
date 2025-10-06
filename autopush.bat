@echo off
setlocal
set REPO=E:\BBQ_SITE
set BRANCH=main
set HOOK_URL=https://api.vercel.com/v1/integrations/deploy/prj_nhuHgdGOTehZGMuabcMVzTPtvcJX/Ymb7x0wu0E
set SITE=https://bbqcorner.vercel.app/

cd /d "%REPO%" || (echo ❌ Repo path not found & pause & exit /b 1)
set GIT_PAGER=cat

git add -A
git commit -m "Auto update %date% %time%" || echo ℹ️ No changes to commit
git pull --rebase origin %BRANCH%
git push origin %BRANCH% || (echo ❌ Git push failed & pause & exit /b 1)

echo 🚀 Trigger Vercel deploy...
for /f %%C in ('curl -s -o NUL -w "%%{http_code}" -X POST "%HOOK_URL%"') do set CODE=%%C
echo HTTP %CODE%
if not "%CODE%"=="200" echo ⚠️ Deploy hook did not return 200 (got %CODE%).

start %SITE%
pause
