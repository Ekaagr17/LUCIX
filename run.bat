@echo off
title LUCIX Forensic Investigation OS
echo ========================================================
echo   LUCIX — Enterprise Cyber Investigation OS
echo   Powered by NVIDIA NIM & Geoapify GEOINT
echo ========================================================
echo.
echo Starting LUCIX bridge server...
start http://localhost:8080/
python server.py
pause
