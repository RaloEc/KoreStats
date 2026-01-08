@echo off
echo ========================================
echo Habilitando Realtime para Votos de Hilos
echo ========================================
echo.

echo [1/1] Aplicando migracion de base de datos...
npx supabase db push --db-url %SUPABASE_DB_URL% --file supabase/migrations/20251010000001_habilitar_realtime_votos_hilos.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo al aplicar la migracion
    echo Por favor verifica tu conexion a Supabase
    pause
    exit /b 1
)

echo.
echo ========================================
echo Instalacion completada exitosamente!
echo ========================================
echo.
echo Realtime ha sido habilitado para votos de hilos.
echo.
echo Ahora los votos de hilos se sincronizaran en tiempo real
echo entre todos los navegadores conectados.
echo.
echo Para probar:
echo 1. Abre el foro en Chrome con una cuenta
echo 2. Abre el foro en Firefox con otra cuenta
echo 3. Vota en un hilo desde Chrome
echo 4. Observa como el voto se actualiza instantaneamente en Firefox
echo.
pause
