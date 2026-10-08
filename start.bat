@echo off
title SmartAttend - RFID Attendance System
echo =========================================================
echo   Starting SmartAttend (AWS Cloud Computing Project)
echo =========================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    node server.js
) else (
    echo Using agy-node runtime...
    agy-node.cmd server.js
)
pause
