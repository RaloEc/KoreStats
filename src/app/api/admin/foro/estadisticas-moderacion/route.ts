import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');

    const { data, error } = await supabase.rpc('obtener_estadisticas_moderacion', {
      p_fecha_inicio: fecha_inicio || undefined,
      p_fecha_fin: fecha_fin || undefined
    });

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ estadisticas: data });
  } catch (error) {
    console.error('Error en GET /api/admin/foro/estadisticas-moderacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
