@echo off
echo Iniciando servidor de desarrollo con logs detallados...
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

set NODE_OPTIONS=--inspect
npm run dev
