


@echo off
setlocal enabledelayedexpansion

set "REPO=E:\BBQ_SITE"
set "BRANCH=main"
set "SITE=https://bbqcorner.vercel.app/"

cd /d "%REPO%" || (echo [X] Repo path not found & pause & exit /b 1)
set GIT_PAGER=cat

REM --- Git add/commit/pull/push ---
git add -A
git commit -m "Auto update %date% %time%" || echo [i] No changes to commit
git pull --rebase origin "%BRANCH%"
git push origin "%BRANCH%" || (echo [X] Git push failed & pause & exit /b 1)

REM --- Само отваряме сайта с cache-buster ---
set "TS=%DATE%_%TIME%"
start "" "%SITE%?v=%RANDOM%%RANDOM%"

pause

