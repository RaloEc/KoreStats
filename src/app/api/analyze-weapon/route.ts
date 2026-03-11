import { createClient, getServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { WeaponStats } from '@/types/weapon';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    console.log('[analyze-weapon] Inicio de request');
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('[analyze-weapon] Usuario no autenticado', { authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[analyze-weapon] Usuario autenticado', { userId: user.id });

    // Rate limiting: Máximo 3 análisis por minuto
    const { count, error: countError } = await supabase
      .from('weapon_analysis_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('created_at', new Date(Date.now() - 60000).toISOString());

    if (countError) {
      console.error('[analyze-weapon] Error al verificar rate limit:', countError);
    } else if (count !== null && count >= 3) {
      console.warn('[analyze-weapon] Rate limit excedido', { userId: user.id, count });
      return NextResponse.json(
        { error: 'Has alcanzado el límite de análisis (3 por minuto). Espera un momento antes de intentar de nuevo.' },
        { status: 429 }
      );
    }
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      console.warn('[analyze-weapon] No se proporcionó archivo');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[analyze-weapon] Archivo recibido', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      console.warn('[analyze-weapon] Archivo supera el límite permitido', {
        size: file.size,
        maxSize: MAX_FILE_SIZE,
      });
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.warn('[analyze-weapon] Tipo de archivo no permitido', { mimeType: file.type });
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Generate unique storage path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'png';
    const storagePath = `${user.id}/${timestamp}.${fileExtension}`;
    console.log('[analyze-weapon] Path generado para Storage', { storagePath });

    // Use service role to upload file
    const serviceSupabase = getServiceClient();

    const { error: uploadError } = await serviceSupabase.storage
      .from('weapon-analysis-temp')
      .upload(storagePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[analyze-weapon] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    console.log('[analyze-weapon] Archivo almacenado correctamente', { storagePath });

    // Create job record in database
    const { data: job, error: insertError } = await serviceSupabase
      .from('weapon_analysis_jobs')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        bucket: 'weapon-analysis-temp',
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !job) {
      console.error('[analyze-weapon] Insert error:', insertError);
      // Clean up uploaded file
      await serviceSupabase.storage
        .from('weapon-analysis-temp')
        .remove([storagePath]);
      
      return NextResponse.json(
        { error: 'Failed to create analysis job' },
        { status: 500 }
      );
    }

    console.log('[analyze-weapon] Job creado', { jobId: job.id, userId: user.id });

    // Invoke Edge Function asynchronously (fire-and-forget)
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/weapon-analyzer`;
    const invokeKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

    console.log('[analyze-weapon] Preparando invocación de Edge Function', {
      jobId: job.id,
      url: edgeFunctionUrl,
      hasKey: Boolean(invokeKey),
    });

    // Fire-and-forget: don't await this
    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${invokeKey}`,
      },
      body: JSON.stringify({
        jobId: job.id,
      }),
    })
      .then((response) => {
        console.log('[analyze-weapon] Edge Function respondió', {
          jobId: job.id,
          status: response.status,
        });
        if (!response.ok) {
          return response.text().then((text) => {
            console.error('[analyze-weapon] Edge Function error response', {
              jobId: job.id,
              status: response.status,
              body: text,
            });
          });
        }
      })
      .catch((error) => {
        console.error('[analyze-weapon] Edge Function invocation error:', {
          jobId: job.id,
          error: error.message,
        });
      });

    console.log('[analyze-weapon] Edge Function invocada (fire-and-forget)', {
      jobId: job.id,
      edgeFunctionUrl,
    });

    // Respond immediately to client
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[analyze-weapon] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
