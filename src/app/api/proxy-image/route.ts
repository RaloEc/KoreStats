import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime if possible, or Edge if preferred. Default is usually Node.
// export const runtime = 'edge'; // Unleash edge potential if needed, but Node is safer for now.

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
    "am-a.akamaihd.net", // sometimes used by riot
  ];

  let parsedUrl: URL;
  try {
    // Check if the URL is valid
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
    // Custom timeout controller since AbortSignal.timeout might not be available in all runtimes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(decodedUrl, {
      headers: {
        // Use a generic user agent that looks like a browser but is simple
        "User-Agent":
          "Mozilla/5.0 (compatible; KoreStats/1.0; +https://korestats.com)",
        // Remove Referer to avoid hotlink protection issues or privacy leaks
        // "Referer": "https://leagueoflegends.com/",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[proxy-image] Fetch failed: ${response.status} ${response.statusText} for ${decodedUrl}`
      );
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

    // Create response with permissive CORS headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        // Cache for 7 days
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
