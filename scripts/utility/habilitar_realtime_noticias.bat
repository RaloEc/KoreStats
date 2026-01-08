@echo off
echo ========================================
echo Habilitando Realtime para Noticias
echo ========================================
echo.

echo Aplicando migracion de Realtime...
supabase db push --db-url "%SUPABASE_DB_URL%" --file "supabase/migrations/20250115_habilitar_realtime_noticias.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Realtime habilitado exitosamente!
    echo ========================================
    echo.
    echo Las estadisticas ahora se actualizaran en tiempo real cuando:
    echo - Se cree una nueva noticia
    echo - Se actualice una noticia existente
    echo - Se elimine una noticia
    echo - Se incrementen las vistas de una noticia
    echo.
) else (
    echo.
    echo ========================================
    echo Error al habilitar Realtime
    echo ========================================
    echo.
    echo Verifica tu conexion a Supabase y vuelve a intentar.
    echo.
)

pause
