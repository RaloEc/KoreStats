@echo off
chcp 65001 >nul
echo ========================================
echo Verificación del Panel de Admin del Foro
echo ========================================
echo.

set "ERRORES=0"
set "ADVERTENCIAS=0"

echo [1/6] Verificando archivos de componentes...
echo.

:: Componentes principales
if exist "src\components\admin\foro\EstadisticasGenerales.tsx" (
    echo ✓ EstadisticasGenerales.tsx
) else (
    echo ✗ EstadisticasGenerales.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\GraficoActividad.tsx" (
    echo ✓ GraficoActividad.tsx
) else (
    echo ✗ GraficoActividad.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\HilosPopulares.tsx" (
    echo ✓ HilosPopulares.tsx
) else (
    echo ✗ HilosPopulares.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\UsuariosActivos.tsx" (
    echo ✓ UsuariosActivos.tsx
) else (
    echo ✗ UsuariosActivos.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\EstadisticasCategorias.tsx" (
    echo ✓ EstadisticasCategorias.tsx
) else (
    echo ✗ EstadisticasCategorias.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\PanelModeracion.tsx" (
    echo ✓ PanelModeracion.tsx
) else (
    echo ✗ PanelModeracion.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\GestorCategorias.tsx" (
    echo ✓ GestorCategorias.tsx
) else (
    echo ✗ GestorCategorias.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\BusquedaAvanzada.tsx" (
    echo ✓ BusquedaAvanzada.tsx
) else (
    echo ✗ BusquedaAvanzada.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\NotificacionesRealTime.tsx" (
    echo ✓ NotificacionesRealTime.tsx
) else (
    echo ✗ NotificacionesRealTime.tsx - FALTA
    set /a ERRORES+=1
)

echo.
echo [2/6] Verificando hooks personalizados...
echo.

if exist "src\components\admin\foro\hooks\useEstadisticasForo.ts" (
    echo ✓ useEstadisticasForo.ts
) else (
    echo ✗ useEstadisticasForo.ts - FALTA
    set /a ERRORES+=1
)

if exist "src\components\admin\foro\hooks\useModeracionForo.ts" (
    echo ✓ useModeracionForo.ts
) else (
    echo ✗ useModeracionForo.ts - FALTA
    set /a ERRORES+=1
)

echo.
echo [3/6] Verificando páginas y rutas API...
echo.

if exist "src\app\admin\foro\page.new.tsx" (
    echo ✓ page.new.tsx
) else (
    echo ✗ page.new.tsx - FALTA
    set /a ERRORES+=1
)

if exist "src\app\api\admin\foro\categorias\orden\route.ts" (
    echo ✓ API orden de categorías
) else (
    echo ✗ API orden de categorías - FALTA
    set /a ERRORES+=1
)

echo.
echo [4/6] Verificando migraciones SQL...
echo.

if exist "supabase\migrations\20250103_estadisticas_foro_admin.sql" (
    echo ✓ 20250103_estadisticas_foro_admin.sql
) else (
    echo ✗ 20250103_estadisticas_foro_admin.sql - FALTA
    set /a ERRORES+=1
)

echo.
echo [5/6] Verificando documentación...
echo.

if exist "docs\ADMIN_FORO_OPTIMIZADO.md" (
    echo ✓ ADMIN_FORO_OPTIMIZADO.md
) else (
    echo ! ADMIN_FORO_OPTIMIZADO.md - FALTA
    set /a ADVERTENCIAS+=1
)

if exist "docs\GUIA_IMPLEMENTACION_ADMIN_FORO.md" (
    echo ✓ GUIA_IMPLEMENTACION_ADMIN_FORO.md
) else (
    echo ! GUIA_IMPLEMENTACION_ADMIN_FORO.md - FALTA
    set /a ADVERTENCIAS+=1
)

echo.
echo [6/6] Verificando dependencias en package.json...
echo.

findstr /C:"@dnd-kit/core" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ @dnd-kit/core instalado
) else (
    echo ! @dnd-kit/core - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

findstr /C:"@dnd-kit/sortable" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ @dnd-kit/sortable instalado
) else (
    echo ! @dnd-kit/sortable - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

findstr /C:"@dnd-kit/utilities" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ @dnd-kit/utilities instalado
) else (
    echo ! @dnd-kit/utilities - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

findstr /C:"recharts" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ recharts instalado
) else (
    echo ! recharts - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

findstr /C:"date-fns" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ date-fns instalado
) else (
    echo ! date-fns - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

findstr /C:"react-intersection-observer" package.json >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ react-intersection-observer instalado
) else (
    echo ! react-intersection-observer - NO INSTALADO
    set /a ADVERTENCIAS+=1
)

echo.
echo ========================================
echo Resumen de Verificación
echo ========================================
echo.

if %ERRORES% equ 0 (
    echo ✓ Todos los archivos críticos están presentes
) else (
    echo ✗ Se encontraron %ERRORES% errores críticos
)

if %ADVERTENCIAS% equ 0 (
    echo ✓ No hay advertencias
) else (
    echo ! Se encontraron %ADVERTENCIAS% advertencias
)

echo.

if %ERRORES% gtr 0 (
    echo ESTADO: INSTALACIÓN INCOMPLETA
    echo.
    echo Acciones requeridas:
    echo 1. Verifica que todos los archivos se hayan creado
    echo 2. Revisa los errores marcados con ✗
    echo 3. Consulta la documentación en docs\
    echo.
) else if %ADVERTENCIAS% gtr 0 (
    echo ESTADO: INSTALACIÓN COMPLETA CON ADVERTENCIAS
    echo.
    echo Acciones recomendadas:
    echo 1. Instala las dependencias faltantes: npm install
    echo 2. Revisa las advertencias marcadas con !
    echo.
) else (
    echo ESTADO: INSTALACIÓN COMPLETA Y VERIFICADA
    echo.
    echo Próximos pasos:
    echo 1. Ejecutar migración SQL en Supabase
    echo 2. Activar la nueva versión con: instalar_admin_foro_optimizado.bat
    echo 3. Iniciar servidor: npm run dev
    echo.
)

echo ========================================
echo.
pause
