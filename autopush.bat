@echo off
setlocal enabledelayedexpansion

set "REPO=E:\BBQ_SITE"
set "BRANCH=main"
set "HOOK_URL=https://api.vercel.com/v1/integrations/deploy/prj_nhuHgdGOTehZGMuabcMVzTPtvcJX/Ymb7x0wu0E"
set "SITE=https://bbqcorner.vercel.app/"

cd /d "%REPO%" || (echo [X] Repo path not found & pause & exit /b 1)
set GIT_PAGER=cat

REM --- Git add/commit/pull/push ---
git add -A
git commit -m "Auto update %date% %time%" || echo [i] No changes to commit
git pull --rebase origin "%BRANCH%"
git push origin "%BRANCH%" || (echo [X] Git push failed & pause & exit /b 1)

REM --- Trigger Vercel Deploy Hook (1 retry) ---
echo [>] Trigger Vercel deploy...
for /f %%C in ('curl -s -o NUL -w "%%{http_code}" -X POST "%HOOK_URL%"') do set CODE=%%C
echo [i] Hook HTTP: !CODE!
if not "!CODE!"=="200" (
  echo [!] Retrying deploy hook in 3s...
  timeout /t 3 >nul
  for /f %%C in ('curl -s -o NUL -w "%%{http_code}" -X POST "%HOOK_URL%"') do set CODE=%%C
  echo [i] Hook HTTP: !CODE!
)

REM --- Open site with cache-buster ---
start "" "%SITE%"

pause
