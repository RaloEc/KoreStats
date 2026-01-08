@echo off
echo Haciendo commit y push a la rama secundaria...

REM Añadir todos los cambios
git add .

REM Crear commit con mensaje
git commit -m "Corregido error de tipos en componentes: username y avatar_url ahora se obtienen de profile en lugar de authUser"

REM Push a la rama segunda-funcionando
git push origin segunda-funcionando

echo Proceso completado!
pause
