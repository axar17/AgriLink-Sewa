@echo off
title AgriLink Sewa - National Logistics & Mandi Portal
echo =====================================================
echo   AGRILINK SEWA - REAL-TIME WEB PLATFORM LAUNCHER
echo   Starting local web server on port 8080...
echo   Open in browser: http://localhost:8080/index.html
echo =====================================================
start http://localhost:8080/index.html
python -m http.server 8080
pause
