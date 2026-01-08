@echo off
echo ========================================
echo Aplicando Migraciones de Soft Delete
echo ========================================
echo.
echo Esta operacion aplicara:
echo 1. Fix contador comentarios noticias (excluir eliminados)
echo 2. Fix contador respuestas foro (excluir eliminados)
echo 3. Soft delete en cascada para posts
echo.
pause

echo.
echo Aplicando migraciones...
supabase db push

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Migraciones aplicadas exitosamente!
    echo ========================================
    echo.
    echo Funcionalidades implementadas:
    echo - Contadores excluyen posts eliminados
    echo - Eliminacion en cascada de respuestas
    echo - Restauracion en cascada
    echo - Contador en tiempo real en cabecera
    echo.
) else (
    echo.
    echo ========================================
    echo Error al aplicar las migraciones
    echo ========================================
    echo.
    echo Verifica:
    echo 1. Que Supabase CLI este instalado
    echo 2. Que estes conectado al proyecto
    echo 3. Los logs de error arriba
    echo.
)

pause
