@echo off
echo ================================================
echo INSTALACION DEL SISTEMA DE MODERACION DEL FORO
echo ================================================
echo.

echo [1/3] Aplicando migraciones de base de datos...
echo.

REM Verificar si existe Supabase CLI
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI no esta instalado
    echo Por favor instala Supabase CLI primero
    pause
    exit /b 1
)

REM Aplicar migraciones
echo Aplicando migracion de tablas...
supabase db push

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo al aplicar migraciones
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando dependencias de React Query...
echo.

REM Verificar si React Query esta instalado
npm list @tanstack/react-query >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Instalando @tanstack/react-query...
    npm install @tanstack/react-query
)

echo.
echo [3/3] Verificando estructura de archivos...
echo.

REM Verificar archivos criticos
set ARCHIVOS_CRITICOS=^
    src\app\api\admin\foro\reportes\route.ts ^
    src\app\api\admin\foro\sanciones\route.ts ^
    src\components\admin\foro\moderacion\TablaReportes.tsx ^
    src\components\admin\foro\moderacion\GestionUsuarios.tsx ^
    src\components\admin\foro\moderacion\EstadisticasModeracion.tsx ^
    src\components\foro\BotonReportar.tsx

set ARCHIVOS_FALTANTES=0

for %%f in (%ARCHIVOS_CRITICOS%) do (
    if not exist "%%f" (
        echo ADVERTENCIA: Archivo faltante - %%f
        set ARCHIVOS_FALTANTES=1
    )
)

if %ARCHIVOS_FALTANTES% EQU 1 (
    echo.
    echo ADVERTENCIA: Algunos archivos criticos no se encontraron
    echo El sistema podria no funcionar correctamente
    echo.
)

echo.
echo ================================================
echo INSTALACION COMPLETADA
echo ================================================
echo.
echo El sistema de moderacion ha sido instalado correctamente.
echo.
echo Proximos pasos:
echo 1. Verifica que las migraciones se aplicaron correctamente en Supabase
echo 2. Accede a /admin/foro para usar el panel de moderacion
echo 3. Revisa la documentacion en docs/SISTEMA_MODERACION_FORO.md
echo.
echo Funcionalidades disponibles:
echo - Gestion de reportes de contenido
echo - Sistema de sanciones a usuarios
echo - Historial de moderacion
echo - Estadisticas en tiempo real
echo - Procesamiento masivo de reportes
echo.

pause
