@echo off
echo ========================================
echo Aplicando Eliminacion en Cascada Posts
echo ========================================
echo.
echo Esta migracion implementa:
echo - Soft delete en cascada para posts
echo - Eliminacion recursiva de respuestas
echo - Funcion de restauracion en cascada
echo.
pause

echo.
echo Aplicando migracion...
supabase db push

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Migracion aplicada exitosamente!
    echo ========================================
    echo.
    echo Ahora cuando elimines un post:
    echo - Se eliminara el post principal
    echo - Se eliminaran todas sus respuestas
    echo - Se mantendra la integridad de datos
    echo.
) else (
    echo.
    echo ========================================
    echo Error al aplicar la migracion
    echo ========================================
    echo.
    echo Verifica:
    echo 1. Que Supabase CLI este instalado
    echo 2. Que estes conectado al proyecto
    echo 3. Los logs de error arriba
    echo.
)

pause
