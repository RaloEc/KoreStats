@echo off
echo ========================================
echo Instalando dependencias para optimizacion
echo ========================================
echo.

echo Instalando react-window y react-virtualized-auto-sizer...
call npm install react-window react-virtualized-auto-sizer

echo.
echo Instalando tipos de TypeScript...
call npm install --save-dev @types/react-window

echo.
echo ========================================
echo Instalacion completada
echo ========================================
pause
