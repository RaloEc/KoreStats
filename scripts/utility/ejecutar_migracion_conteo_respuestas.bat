@echo off
echo Ejecutando migracion para contar respuestas por hilo...
supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres
echo Migracion completada.
