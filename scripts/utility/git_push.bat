@echo off
echo Ejecutando git add .
git add .
echo.

echo Ejecutando git status
git status
echo.

echo Ejecutando git commit
git commit -m "Mejora del selector de modo claro/oscuro y optimización de la página de noticias"
echo.

echo Ejecutando git push
git push
echo.

echo Proceso completado
pause
