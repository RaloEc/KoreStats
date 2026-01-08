@echo off
echo Ejecutando migracion para la funcion RPC contar_comentarios_por_noticia...
echo.

REM Cargar variables de entorno desde .env.local
for /f "tokens=1,2 delims==" %%a in (.env.local) do (
    if "%%a"=="SUPABASE_URL" set SUPABASE_URL=%%b
    if "%%a"=="SUPABASE_SERVICE_ROLE_KEY" set SUPABASE_SERVICE_ROLE_KEY=%%b
    if "%%a"=="SUPABASE_DB_PASSWORD" set SUPABASE_DB_PASSWORD=%%b
)

REM Verificar si las variables se cargaron correctamente
if "%SUPABASE_URL%"=="" (
    echo Error: No se pudo cargar SUPABASE_URL desde .env.local
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo Error: No se pudo cargar SUPABASE_SERVICE_ROLE_KEY desde .env.local
    exit /b 1
)

echo Ejecutando migracion SQL...
echo.

REM Ejecutar el archivo SQL usando curl
curl -X POST ^
  "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SUPABASE_SERVICE_ROLE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "@supabase/migrations/20250928201000_contar_comentarios_por_noticia.sql"

echo.
echo Migracion completada!
pause
