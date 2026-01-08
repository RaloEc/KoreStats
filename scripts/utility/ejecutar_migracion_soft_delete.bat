@echo off
chcp 65001 >nul
echo ====================================
echo Aplicando migración de soft delete
echo ====================================
echo.

echo Este script aplicará la migración que añade las columnas:
echo - deleted (BOOLEAN)
echo - deleted_at (TIMESTAMPTZ)
echo - deleted_by (UUID)
echo.
echo A las tablas: comentarios y foro_posts
echo.

echo Leyendo archivo de migración...
type supabase\migrations\20250904000000_soft_delete_comentarios.sql

echo.
echo ====================================
echo Ejecutando migración...
echo ====================================

REM Ejecutar usando el CLI de Supabase
npx supabase migration up --db-url postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres

echo.
echo ====================================
echo Migración completada
echo ====================================
echo.
echo NOTA: Si obtuviste un error de autenticación, edita este archivo
echo y reemplaza [YOUR_PASSWORD] y [YOUR_PROJECT_REF] con tus credenciales.
echo.
echo Puedes encontrar tu URL de conexión en:
echo https://supabase.com/dashboard/project/[tu-proyecto]/settings/database
echo.
pause
