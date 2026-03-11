import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si es administrador
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();
      
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    
    // Obtener evento por ID
    const { data: evento, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error al obtener evento:', error);
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(evento);
  } catch (error) {
    console.error('Error en la ruta de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si es administrador
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();
      
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    
    // Obtener datos actualizados
    const eventoData = await request.json();
    
    // Validar datos mínimos
    if (!eventoData.titulo || !eventoData.fecha || !eventoData.tipo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    
    // Verificar si el estado cambió a publicado
    let actualizaciones = {
      ...eventoData,
      actualizado_en: new Date().toISOString()
    };
    
    // Si el estado cambió a publicado, actualizar la fecha de publicación
    if (eventoData.estado === 'publicado') {
      // Verificar si ya estaba publicado
      const { data: eventoActual } = await supabase
        .from('eventos')
        .select('estado, publicado_en')
        .eq('id', id)
        .single();
        
      if (eventoActual && eventoActual.estado !== 'publicado') {
        actualizaciones.publicado_en = new Date().toISOString();
      }
    }
    
    // Actualizar evento
    const { data, error } = await supabase
      .from('eventos')
      .update(actualizaciones)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error al actualizar evento:', error);
      return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en la ruta de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si es administrador
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();
      
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    
    // Eliminar evento
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error al eliminar evento:', error);
      return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en la ruta de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
