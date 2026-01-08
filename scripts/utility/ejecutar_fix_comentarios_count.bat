@echo off
echo =====================================================
echo Ejecutando migración: fix_comentarios_count_deleted
echo =====================================================
echo.
echo Esta migración corrige el contador de comentarios para excluir posts eliminados
echo.
pause

npx supabase db push --db-url "%DATABASE_URL%" --include-all

echo.
echo =====================================================
echo Migración completada
echo =====================================================
echo.
echo Los contadores de comentarios ahora excluyen posts con deleted=true
echo.
pause
