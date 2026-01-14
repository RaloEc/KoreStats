import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for better fetch compatibility
export const runtime = "nodejs";

// Disable static caching to ensure fresh responses
export const dynamic = "force-dynamic";

/**
 * Proxy de imágenes para evitar problemas de CORS con html-to-image
 * Descarga la imagen en el servidor y la devuelve con headers CORS permisivos
 *
 * IMPORTANTE: Este proxy incluye validación de contenido para asegurar que
 * solo se devuelvan imágenes válidas y evitar contaminación de caché
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  // Validación de parámetro URL
  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required", code: "MISSING_URL" },
      { status: 400 }
    );
  }

  // Decodificar la URL
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }

  // Validar que la URL sea de dominios permitidos (DDragon de Riot)
  const allowedDomains = [
    "ddragon.leagueoflegends.com",
    "raw.communitydragon.org",
    "cdn.communitydragon.org",
    "am-a.akamaihd.net",
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodedUrl);

    // Security check: ensure protocol is http or https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }

    const isAllowed = allowedDomains.some((domain) =>
      parsedUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      console.error(`[proxy-image] Blocked domain: ${parsedUrl.hostname}`);
      return NextResponse.json(
        {
          error: `Domain not allowed: ${parsedUrl.hostname}`,
          code: "DOMAIN_NOT_ALLOWED",
          allowedDomains,
        },
        { status: 403 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid URL format: ${decodedUrl}`, code: "INVALID_URL" },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // Fetch con redirect: "follow" para seguir redirecciones de CDN
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KoreStats/1.0; +https://korestats.com)",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow", // Importante: seguir redirects de CommunityDragon
      cache: "no-store", // No usar caché del servidor para evitar contaminación
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[proxy-image] Fetch failed: ${response.status} for ${decodedUrl}`
      );
      return NextResponse.json(
        {
          error: `Failed to fetch image`,
          code: "FETCH_FAILED",
          status: response.status,
        },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    // Validar que el contenido sea realmente una imagen
    // Los primeros bytes de un PNG son: 89 50 4E 47 (‰PNG)
    // Los primeros bytes de un JPEG son: FF D8 FF
    // Los primeros bytes de un GIF son: 47 49 46 (GIF)
    const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
    const isPNG =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
    const isWebP =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;

    if (!isPNG && !isJPEG && !isGIF && !isWebP) {
      console.error(
        `[proxy-image] Invalid image content for ${decodedUrl}. First bytes:`,
        Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")
      );
      return NextResponse.json(
        {
          error: "Response is not a valid image",
          code: "INVALID_IMAGE",
          url: decodedUrl,
        },
        { status: 422 }
      );
    }

    // Determinar el content-type correcto basado en los magic bytes
    let actualContentType = contentType;
    if (isPNG) actualContentType = "image/png";
    else if (isJPEG) actualContentType = "image/jpeg";
    else if (isGIF) actualContentType = "image/gif";
    else if (isWebP) actualContentType = "image/webp";

    // Crear hash simple de la URL para incluir en el ETag
    const urlHash = btoa(decodedUrl).slice(0, 16);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": actualContentType,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        // Cache por 1 hora para evitar problemas de caché contaminado
        // El cliente puede usar su propio caché más largo si lo desea
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        // ETag basado en la URL original para validación de caché
        ETag: `"${urlHash}"`,
        // Header personalizado para debug
        "X-Proxied-From": parsedUrl.hostname,
        // Vary header para asegurar caché correcto por URL
        Vary: "Accept",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[proxy-image] Error:", errorMessage, "URL:", decodedUrl);

    return NextResponse.json(
      {
        error: "Failed to fetch image",
        code: "FETCH_ERROR",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
