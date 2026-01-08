@echo off
echo Ejecutando script para corregir la funcion de votos...
cd /d %~dp0
npx supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres ./scripts/corregir_funcion_actualizar_votos.sql
echo Script ejecutado correctamente!
pause
