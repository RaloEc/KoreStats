@echo off
echo ========================================
echo Aplicando corrección del contador de comentarios de noticias
echo ========================================
echo.
echo Este script corrige las funciones que cuentan comentarios
echo para que excluyan los comentarios eliminados (deleted=true)
echo.
echo Presiona cualquier tecla para continuar o Ctrl+C para cancelar...
pause > nul
echo.

REM Verificar que el archivo SQL existe
if not exist "supabase\migrations\20251012000000_fix_contar_comentarios_noticias_deleted.sql" (
    echo ERROR: No se encontró el archivo de migración
    pause
    exit /b 1
)

echo Aplicando migración...
echo.

REM Ejecutar con supabase CLI
supabase db push

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migración aplicada exitosamente
    echo ========================================
    echo.
    echo Las funciones actualizadas son:
    echo - contar_comentarios_por_noticia
    echo - contar_comentarios_por_noticia_uuid
    echo - obtener_contador_comentarios_uuid
    echo.
    echo Ahora los contadores de comentarios en las tarjetas
    echo de noticias excluirán los comentarios eliminados.
) else (
    echo.
    echo ========================================
    echo ERROR: La migración falló
    echo ========================================
    echo.
    echo Revisa los mensajes de error anteriores.
)

echo.
pause
