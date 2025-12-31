import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de imágenes para evitar problemas de CORS con html-to-image
 * Descarga la imagen en el servidor y la devuelve con headers CORS permisivos
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

  // Decodificar la URL por si viene doble-encoded
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
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodedUrl);
    const isAllowed = allowedDomains.some((domain) =>
      parsedUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
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
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://leagueoflegends.com/",
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch image from source`,
          code: "FETCH_FAILED",
          status: response.status,
          statusText: response.statusText,
          url: decodedUrl,
        },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    // Verificar que realmente es una imagen
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Response is not an image",
          code: "NOT_AN_IMAGE",
          contentType,
        },
        { status: 415 }
      );
    }

    // Crear respuesta con headers CORS permisivos
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": arrayBuffer.byteLength.toString(),
        // Headers CORS críticos
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        // Cache agresivo para rendimiento
        "Cache-Control": "public, max-age=604800, immutable",
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
        url: decodedUrl,
      },
      { status: 500 }
    );
  }
}

// Manejar preflight requests para CORS
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
