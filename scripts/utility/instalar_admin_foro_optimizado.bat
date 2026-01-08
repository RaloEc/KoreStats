@echo off
chcp 65001 >nul
echo ========================================
echo Instalación del Panel de Admin del Foro
echo Versión Optimizada v2.0.0
echo ========================================
echo.

:: Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ERROR: No se encuentra package.json
    echo Por favor ejecuta este script desde la raíz del proyecto
    pause
    exit /b 1
)

echo [1/5] Verificando dependencias necesarias...
echo.

:: Verificar si npm está instalado
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm no está instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo ✓ npm encontrado
echo.

echo [2/5] Instalando dependencias de @dnd-kit...
echo.
call npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias
    pause
    exit /b 1
)
echo ✓ Dependencias instaladas
echo.

echo [3/5] Verificando estructura de archivos...
echo.

set "ARCHIVOS_FALTANTES=0"

:: Verificar archivos críticos
if not exist "src\components\admin\foro\hooks\useEstadisticasForo.ts" (
    echo ✗ Falta: useEstadisticasForo.ts
    set "ARCHIVOS_FALTANTES=1"
) else (
    echo ✓ useEstadisticasForo.ts
)

if not exist "src\components\admin\foro\hooks\useModeracionForo.ts" (
    echo ✗ Falta: useModeracionForo.ts
    set "ARCHIVOS_FALTANTES=1"
) else (
    echo ✓ useModeracionForo.ts
)

if not exist "src\app\admin\foro\page.new.tsx" (
    echo ✗ Falta: page.new.tsx
    set "ARCHIVOS_FALTANTES=1"
) else (
    echo ✓ page.new.tsx
)

if not exist "supabase\migrations\20250103_estadisticas_foro_admin.sql" (
    echo ✗ Falta: 20250103_estadisticas_foro_admin.sql
    set "ARCHIVOS_FALTANTES=1"
) else (
    echo ✓ 20250103_estadisticas_foro_admin.sql
)

if "%ARCHIVOS_FALTANTES%"=="1" (
    echo.
    echo ERROR: Faltan archivos críticos
    echo Por favor verifica que todos los archivos se hayan creado correctamente
    pause
    exit /b 1
)

echo.
echo ✓ Todos los archivos necesarios están presentes
echo.

echo [4/5] Creando backup de la versión actual...
echo.

if exist "src\app\admin\foro\page.tsx" (
    copy /Y "src\app\admin\foro\page.tsx" "src\app\admin\foro\page.backup.tsx" >nul
    echo ✓ Backup creado: page.backup.tsx
) else (
    echo ! No se encontró page.tsx para hacer backup
)
echo.

echo [5/5] Activando nueva versión...
echo.
echo IMPORTANTE: ¿Deseas activar la nueva versión ahora?
echo.
echo Opciones:
echo   1 - Sí, activar ahora (reemplazar page.tsx)
echo   2 - No, mantener ambas versiones para pruebas
echo   3 - Cancelar instalación
echo.
set /p "OPCION=Selecciona una opción (1/2/3): "

if "%OPCION%"=="1" (
    copy /Y "src\app\admin\foro\page.new.tsx" "src\app\admin\foro\page.tsx" >nul
    echo.
    echo ✓ Nueva versión activada
    echo.
    echo SIGUIENTE PASO:
    echo 1. Ejecutar la migración SQL en Supabase
    echo 2. Archivo: supabase\migrations\20250103_estadisticas_foro_admin.sql
    echo 3. Reiniciar el servidor de desarrollo: npm run dev
    echo.
) else if "%OPCION%"=="2" (
    echo.
    echo ✓ Ambas versiones mantenidas
    echo.
    echo Para probar la nueva versión:
    echo 1. Navega a src\app\admin\foro\page.tsx
    echo 2. Importa y usa page.new.tsx
    echo.
) else (
    echo.
    echo Instalación cancelada
    echo.
    pause
    exit /b 0
)

echo ========================================
echo Instalación Completada
echo ========================================
echo.
echo Próximos pasos:
echo.
echo 1. Ejecutar migración SQL en Supabase:
echo    - Ir a SQL Editor en Supabase Dashboard
echo    - Copiar contenido de: supabase\migrations\20250103_estadisticas_foro_admin.sql
echo    - Ejecutar el script
echo.
echo 2. Habilitar Supabase Realtime:
echo    - Ir a Database ^> Replication
echo    - Habilitar para: foro_hilos, foro_comentarios
echo.
echo 3. Verificar instalación:
echo    - npm run dev
echo    - Navegar a: http://localhost:3000/admin/foro
echo.
echo 4. Consultar documentación:
echo    - docs\ADMIN_FORO_OPTIMIZADO.md
echo    - docs\GUIA_IMPLEMENTACION_ADMIN_FORO.md
echo.
echo ========================================
echo.
pause
