import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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

    // 2. Obtener datos del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clanId = formData.get('clanId') as string;
    const type = formData.get('type') as 'logo' | 'banner';

    if (!clanId || !file || !type) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (clanId, file, type)' },
        { status: 400 }
      );
    }

    if (type !== 'logo' && type !== 'banner') {
      return NextResponse.json(
        { error: 'El tipo debe ser "logo" o "banner"' },
        { status: 400 }
      );
    }

    // 3. Verificar que el usuario sea el dueño del clan
    const { data: clan, error: clanError } = await supabase
      .from('clans')
      .select('owner_id, logo_url, banner_url')
      .eq('id', clanId)
      .single();

    if (clanError || !clan) {
      return NextResponse.json(
        { error: 'Clan no encontrado o error al verificar permisos' },
        { status: 404 }
      );
    }

    if (clan.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este clan' },
        { status: 403 }
      );
    }

    // 4. Validar el tipo de archivo (solo imágenes)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // 5. Limitar el tamaño del archivo (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande. El tamaño máximo es de 2MB' },
        { status: 400 }
      );
    }

    // 6. Generar nombre de archivo único
    const fileExt = file.name.split('.').pop() || 'png';
    const folder = type === 'logo' ? 'logos' : 'banners';
    const fileName = `${clanId}-${Date.now()}.${fileExt}`;
    const filePath = `clans/${folder}/${fileName}`;

    // Convertir archivo a Uint8Array para Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Obtener cliente de servicio para operaciones de storage y base de datos
    const serviceClient = getServiceClient();

    // 7. Subir a Supabase Storage (bucket 'profiles')
    const { error: uploadError } = await serviceClient.storage
      .from('profiles')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[clan-upload] Error al subir imagen:', uploadError);
      return NextResponse.json(
        { error: `Error al subir imagen: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 8. Obtener la URL pública
    const { data: { publicUrl } } = serviceClient.storage
      .from('profiles')
      .getPublicUrl(filePath);

    // 9. Eliminar la imagen anterior si existía para mantener limpio el Storage
    const oldUrl = type === 'logo' ? clan.logo_url : clan.banner_url;
    if (oldUrl && oldUrl.includes('/storage/v1/object/public/profiles/clans/')) {
      try {
        const oldPath = oldUrl.split('/profiles/')[1];
        if (oldPath) {
          await serviceClient.storage.from('profiles').remove([oldPath]);
          console.log('[clan-upload] Eliminada imagen antigua del storage:', oldPath);
        }
      } catch (e) {
        console.warn('[clan-upload] No se pudo eliminar la imagen antigua:', e);
      }
    }

    // 10. Actualizar base de datos
    const updateField = type === 'logo' ? 'logo_url' : 'banner_url';
    const { error: updateError } = await serviceClient
      .from('clans')
      .update({ [updateField]: publicUrl })
      .eq('id', clanId);

    if (updateError) {
      console.error('[clan-upload] Error al actualizar clan en BD:', updateError);
      return NextResponse.json(
        { error: 'Error al guardar los datos del clan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl
    });
  } catch (error: any) {
    console.error('[clan-upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
