import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // 1. Verificar sesión del usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: clanId } = await params;
    const body = await request.json();
    const { reason, reported_item, description } = body;

    // 2. Validar parámetros
    if (!reason || !reported_item) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (reason, reported_item)' },
        { status: 400 }
      );
    }

    if (!['logo', 'banner', 'general'].includes(reported_item)) {
      return NextResponse.json(
        { error: 'reported_item inválido. Debe ser "logo", "banner" o "general"' },
        { status: 400 }
      );
    }

    // 3. Verificar si el clan existe
    const { data: clan, error: clanError } = await supabase
      .from('clans')
      .select('id')
      .eq('id', clanId)
      .single();

    if (clanError || !clan) {
      return NextResponse.json(
        { error: 'El clan reportado no existe' },
        { status: 404 }
      );
    }

    // 4. Prevenir reportes duplicados del mismo usuario para el mismo clan
    // para evitar spam de reportes
    const { data: existingReport } = await supabase
      .from('clan_reports')
      .select('id')
      .eq('clan_id', clanId)
      .eq('reporter_id', user.id)
      .eq('reported_item', reported_item)
      .eq('status', 'pending')
      .limit(1);

    if (existingReport && existingReport.length > 0) {
      return NextResponse.json(
        { error: `Ya has reportado el ${reported_item === 'logo' ? 'logotipo' : reported_item === 'banner' ? 'banner' : 'clan'} anteriormente y está bajo revisión.` },
        { status: 400 }
      );
    }

    // 5. Insertar reporte
    const { error: insertError } = await supabase
      .from('clan_reports')
      .insert({
        clan_id: clanId,
        reporter_id: user.id,
        reported_item,
        reason,
        description: description || null
      });

    if (insertError) {
      console.error('[clan-report] Error al guardar reporte:', insertError);
      return NextResponse.json(
        { error: 'Error al procesar el reporte en el servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('[clan-report] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
