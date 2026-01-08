@echo off
echo ========================================
echo Aplicando corrección del contador de comentarios de noticias
echo ========================================
echo.

REM Cargar variables de entorno
if exist .env.local (
    echo Cargando variables de entorno...
    for /f "tokens=*" %%a in ('type .env.local ^| findstr /v "^#"') do set %%a
) else (
    echo ERROR: No se encontró el archivo .env.local
    pause
    exit /b 1
)

REM Verificar que las variables necesarias estén configuradas
if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo ERROR: NEXT_PUBLIC_SUPABASE_URL no está configurado
    pause
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurado
    pause
    exit /b 1
)

echo URL de Supabase: %NEXT_PUBLIC_SUPABASE_URL%
echo.

REM Leer el contenido del archivo SQL
set "SQL_FILE=supabase\migrations\20251012000000_fix_contar_comentarios_noticias_deleted.sql"

if not exist "%SQL_FILE%" (
    echo ERROR: No se encontró el archivo %SQL_FILE%
    pause
    exit /b 1
)

echo Leyendo archivo SQL...
set "SQL_CONTENT="
for /f "usebackq delims=" %%a in ("%SQL_FILE%") do (
    set "line=%%a"
    setlocal enabledelayedexpansion
    set "SQL_CONTENT=!SQL_CONTENT!!line! "
    endlocal
)

echo Ejecutando migración...
echo.

REM Ejecutar la migración usando curl
curl -X POST "%NEXT_PUBLIC_SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SUPABASE_SERVICE_ROLE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"%SQL_CONTENT%\"}"

echo.
echo.
echo ========================================
echo Migración completada
echo ========================================
echo.
echo IMPORTANTE: Verifica que no haya errores en la salida anterior.
echo Si hay errores, revisa el archivo SQL y vuelve a ejecutar este script.
echo.

pause
