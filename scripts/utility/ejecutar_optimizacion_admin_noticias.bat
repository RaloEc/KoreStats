@echo off
echo ========================================
echo Optimizacion Admin Noticias - Migracion
echo ========================================
echo.
echo Este script ejecutara la funcion SQL optimizada
echo para estadisticas de administracion de noticias.
echo.
echo Presiona cualquier tecla para continuar...
pause > nul

echo.
echo Ejecutando migracion SQL...
echo.

supabase db push --file scripts/crear_funcion_estadisticas_admin.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migracion completada exitosamente!
    echo ========================================
    echo.
    echo Proximos pasos:
    echo 1. Reemplaza el archivo page.tsx con page.optimized.tsx
    echo 2. Reinicia el servidor de desarrollo
    echo 3. Verifica que las estadisticas se actualicen en tiempo real
    echo.
) else (
    echo.
    echo ========================================
    echo Error al ejecutar la migracion
    echo ========================================
    echo.
    echo Si no tienes Supabase CLI instalado, ejecuta el script SQL manualmente:
    echo 1. Abre el dashboard de Supabase
    echo 2. Ve a SQL Editor
    echo 3. Copia y pega el contenido de scripts/crear_funcion_estadisticas_admin.sql
    echo 4. Ejecuta el script
    echo.
)

echo.
echo Presiona cualquier tecla para salir...
pause > nul
