@echo off
echo ========================================
echo Ejecutando migracion de reportes con slug
echo ========================================
echo.

REM Verificar si Supabase CLI está instalado
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI no esta instalado
    echo Por favor instala Supabase CLI desde: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo Aplicando migracion...
supabase db push --db-url "%SUPABASE_DB_URL%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migracion completada exitosamente
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR: La migracion fallo
    echo ========================================
)

echo.
pause
