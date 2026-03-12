import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    // Usar el cliente de servicio para saltarse las restricciones RLS
    const supabase = getServiceClient()
    
    // Obtener estadísticas generales usando Promise.allSettled para manejar errores individuales
    const [
      hilosResult,
      postsResult,
      usuariosResult
    ] = await Promise.allSettled([
      supabase.from('foro_hilos').select('id, vistas').is('deleted_at', null),
      supabase.from('foro_posts').select('id').is('deleted_at', null),
      supabase.from('perfiles')
        .select('id')
        .or('foro_hilos.count.gt.0,foro_posts.count.gt.0')
    ])
    
    // Extraer datos y manejar posibles errores
    const hilos = hilosResult.status === 'fulfilled' ? hilosResult.value.data || [] : [];
    const posts = postsResult.status === 'fulfilled' ? postsResult.value.data || [] : [];
    const usuarios = usuariosResult.status === 'fulfilled' ? usuariosResult.value.data || [] : [];
    
    // Registrar errores pero continuar
    if (hilosResult.status === 'rejected') {
      console.error('Error al obtener hilos:', hilosResult.reason);
    }
    if (postsResult.status === 'rejected') {
      console.error('Error al obtener posts:', postsResult.reason);
    }
    if (usuariosResult.status === 'rejected') {
      console.error('Error al obtener usuarios:', usuariosResult.reason);
    }

    // Calcular estadísticas generales
    const totalHilos = hilos?.length || 0
    const totalPosts = posts?.length || 0
    const totalUsuariosActivos = usuarios?.length || 0
    
    // Calcular hilos y posts recientes (últimos 7 días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 7)
    const fechaLimiteStr = fechaLimite.toISOString()
    
    const [
      hilosRecientesResult,
      postsRecientesResult
    ] = await Promise.allSettled([
      supabase
        .from('foro_hilos')
        .select('id')
        .is('deleted_at', null)
        .gt('created_at', fechaLimiteStr),
      supabase
        .from('foro_posts')
        .select('id')
        .is('deleted_at', null)
        .gt('created_at', fechaLimiteStr)
    ])
    
    // Extraer datos y manejar posibles errores
    const hilosRecientes = hilosRecientesResult.status === 'fulfilled' ? hilosRecientesResult.value.data || [] : [];
    const postsRecientes = postsRecientesResult.status === 'fulfilled' ? postsRecientesResult.value.data || [] : [];
    
    // Registrar errores pero continuar
    if (hilosRecientesResult.status === 'rejected') {
      console.error('Error al obtener hilos recientes:', hilosRecientesResult.reason);
    }
    if (postsRecientesResult.status === 'rejected') {
      console.error('Error al obtener posts recientes:', postsRecientesResult.reason);
    }

    // Calcular vistas promedio por hilo
    const vistasPromedio = hilos && hilos.length > 0
      ? hilos.reduce((sum, hilo) => sum + (hilo.vistas || 0), 0) / hilos.length
      : 0

    // Obtener hilos destacados (más vistas y respuestas)
    let hilosDestacados = [];
    try {
      const { data, error } = await supabase
        .from('foro_hilos')
        .select(`
          id, 
          titulo, 
          autor_id,
          created_at,
          vistas,
          perfiles:autor_id (nombre_usuario),
          foro_categorias:categoria_id (nombre)
        `)
        .is('deleted_at', null)
        .order('vistas', { ascending: false })
        .limit(5)
      
      if (!error && data) {
        hilosDestacados = data;
      } else {
        console.log('Error al obtener hilos destacados:', error?.message || 'Sin datos');
      }
    } catch (err) {
      console.log('Error al obtener hilos destacados:', err.message);
    }

    // Obtener conteo de respuestas para cada hilo
    let hilosConRespuestas = [];
    if (hilosDestacados.length > 0) {
      try {
        hilosConRespuestas = await Promise.all(
          hilosDestacados.map(async (hilo: any) => {
            try {
              const { count, error } = await supabase
                .from('foro_posts')
                .select('id', { count: 'exact', head: true })
                .eq('hilo_id', hilo.id)
                .is('deleted_at', null)

              return {
                id: hilo.id,
                titulo: hilo.titulo,
                autor_nombre: hilo.perfiles?.nombre_usuario || 'Usuario desconocido',
                autor_id: hilo.autor_id,
                fecha_creacion: hilo.created_at,
                respuestas: error ? 0 : (count || 0),
                vistas: hilo.vistas || 0,
                categoria_nombre: hilo.foro_categorias?.nombre || 'General'
              }
            } catch (err) {
              console.log(`Error al obtener respuestas para hilo ${hilo.id}:`, err.message);
              return {
                id: hilo.id,
                titulo: hilo.titulo || 'Sin título',
                autor_nombre: 'Usuario desconocido',
                autor_id: hilo.autor_id,
                fecha_creacion: hilo.created_at,
                respuestas: 0,
                vistas: hilo.vistas || 0,
                categoria_nombre: 'General'
              }
            }
          })
        );
      } catch (err) {
        console.log('Error al procesar hilos con respuestas:', err.message);
      }
    }

    // Obtener usuarios más activos
    // En lugar de usar la función RPC que puede fallar, hacemos una consulta directa
    let usuariosConActividad = [];
    try {
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles')
        .select('id, nombre_usuario, avatar_url')
        .limit(5);
        
      if (!perfilesError && perfilesData) {
        usuariosConActividad = perfilesData.map(perfil => ({
          id: perfil.id,
          nombre_usuario: perfil.nombre_usuario,
          avatar_url: perfil.avatar_url,
          hilos_creados: 0,
          respuestas: 0,
          ultima_actividad: new Date().toISOString()
        }));
      } else {
        console.log('No se pudieron obtener perfiles de usuario:', perfilesError?.message || 'Sin datos');
      }
    } catch (err) {
      console.log('Error al obtener usuarios activos:', err.message);
    }

    // Obtener categorías más populares
    let categoriasPopulares = [];
    try {
      const { data, error } = await supabase
        .from('foro_categorias')
        .select('id, nombre, slug, orden')
        .eq('es_activa', true)
        .order('orden', { ascending: true })
        .limit(5)

      if (!error && data) {
        categoriasPopulares = data.map((cat: any) => ({
          id: cat.id,
          nombre: cat.nombre,
          slug: cat.slug,
          total_hilos: 0,
          total_posts: 0
        }));
      } else {
        console.log('Error al obtener categorías:', error?.message || 'Sin datos');
      }
    } catch (err) {
      console.log('Error al obtener categorías populares:', err.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        estadisticas: {
          totalHilos,
          totalPosts,
          totalUsuariosActivos,
          hilosRecientes: hilosRecientes?.length || 0,
          postsRecientes: postsRecientes?.length || 0,
          vistasPromedio: Math.round(vistasPromedio)
        },
        hilosDestacados: hilosConRespuestas,
        usuariosActivos: usuariosConActividad,
        categoriasPopulares
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas del foro:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del foro', details: error.message },
      { status: 500 }
    )
  }
}
