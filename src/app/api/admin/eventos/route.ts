import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PerfilRow = {
  rol?: string | null;
  role?: string | null;
};

async function ensureAdminRole(
  supabase: SupabaseClient,
  session: Session
): Promise<NextResponse | null> {
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    if (error.code !== '42703') {
      console.error('[eventos] Error verificando rol:', error);
      return NextResponse.json(
        { error: 'Error al verificar permisos' },
        { status: 500 }
      );
    }

    const fallback = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .maybeSingle();

    if (fallback.error) {
      console.error('[eventos] Error verificando rol:', fallback.error);
      return NextResponse.json(
        { error: 'Error al verificar permisos' },
        { status: 500 }
      );
    }

    const fallbackRow = (fallback.data ?? {}) as PerfilRow;
    const fallbackRole = (fallbackRow.rol ?? '').toLowerCase().trim();

    if (fallbackRole !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return null;
  }

  const perfilRow = (perfil ?? {}) as PerfilRow;
  const rolPerfil = (perfilRow.role ?? '').toLowerCase().trim();

  if (rolPerfil !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si es administrador
    const adminCheck = await ensureAdminRole(supabase, session);
    if (adminCheck) {
      return adminCheck;
    }
    
    // Obtener eventos
    const { data: eventos, error } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha', { ascending: true });
      
    if (error) {
      console.error('Error al obtener eventos:', error);
      return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
    }
    
    return NextResponse.json(eventos);
  } catch (error) {
    console.error('Error en la ruta de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si es administrador
    const adminCheck = await ensureAdminRole(supabase, session);
    if (adminCheck) {
      return adminCheck;
    }
    
    // Obtener datos del evento
    const eventoData = await request.json();
    
    // Validar datos mínimos
    if (!eventoData.titulo || !eventoData.fecha || !eventoData.tipo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    
    // Preparar datos para inserción con columnas existentes
    const {
      titulo,
      descripcion,
      fecha,
      tipo,
      juego_nombre,
      imagen_url,
      icono_url,
      url,
      estado,
    } = eventoData;

    const nuevoEvento = {
      titulo,
      descripcion: descripcion ?? null,
      fecha,
      tipo,
      juego_nombre: juego_nombre ?? null,
      imagen_url: imagen_url ?? null,
      icono_url: icono_url ?? null,
      url: url ?? null,
      estado: estado ?? 'borrador',
    };

    // Insertar evento
    const { data, error } = await supabase
      .from('eventos')
      .insert(nuevoEvento)
      .select()
      .single();
      
    if (error) {
      console.error('Error al crear evento:', error);
      return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en la ruta de eventos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
