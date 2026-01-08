@echo off
echo ================================================
echo Aplicando funciones de moderacion del foro
echo ================================================
echo.

cd /d "%~dp0"

echo Ejecutando migracion...
supabase db push --db-url "postgresql://postgres.qeeaptyhcqfaqdecsuqc:RaloEc2005@aws-0-us-east-1.pooler.supabase.com:6543/postgres" --include-all

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo Migracion aplicada exitosamente
    echo ================================================
) else (
    echo.
    echo ================================================
    echo ERROR: Fallo al aplicar la migracion
    echo ================================================
)

echo.
pause
