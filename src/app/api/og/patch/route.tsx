import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const bgUrl = searchParams.get("bg");

  if (!version || !bgUrl) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Cargamos Cinzel desde Google Fonts (una de las mejores alternativas gratuitas a Beaufort/Spiegel de LoL)
  // Cargamos Cinzel desde jsDelivr (más robusto que GitHub raw)
  // Usamos un try/catch para evitar que falle toda la imagen si la fuente no carga
  let fontRegular: ArrayBuffer | null = null;
  let fontBold: ArrayBuffer | null = null;

  try {
    [fontRegular, fontBold] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.8/files/cinzel-latin-400-normal.woff"
      ).then((res) => res.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.8/files/cinzel-latin-700-normal.woff"
      ).then((res) => res.arrayBuffer()),
    ]);
  } catch (e) {
    console.warn(
      "Failed to load custom fonts, falling back to system fonts",
      e
    );
  }

  const fonts: any[] = [];
  if (fontRegular) {
    fonts.push({
      name: "Cinzel",
      data: fontRegular,
      style: "normal",
      weight: 400,
    });
  }
  if (fontBold) {
    fonts.push({
      name: "Cinzel",
      data: fontBold,
      style: "normal",
      weight: 700,
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a101a",
          position: "relative",
        }}
      >
        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgUrl}
          alt="background"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Shadow Overlay (Lighter top, very dark bottom) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(to bottom, rgba(10, 16, 26, 0.2) 0%, rgba(10, 16, 26, 0.6) 50%, rgba(10, 16, 26, 0.95) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            height: "100%",
            width: "100%",
            paddingBottom: "60px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              color: "rgba(255,185,45,0.7)",
              fontSize: 22,
              fontFamily: "Cinzel",
              fontWeight: 700,
              position: "absolute",
              top: 40,
              letterSpacing: "0.2em",
              display: "flex",
            }}
          >
            KORESTATS.COM
          </div>

          <div
            style={{
              color: "#ffffff",
              fontSize: 50,
              fontFamily: "Cinzel",
              fontWeight: 400,
              letterSpacing: "0.1em",
              marginBottom: 10,
              display: "flex",
              textShadow: "0 4px 15px rgba(0,0,0,0.5)",
            }}
          >
            NOTAS DEL PARCHE
          </div>

          <div
            style={{
              color: "#c8aa6e", // Metallic Gold typical of LoL
              fontSize: 140,
              fontFamily: "Cinzel",
              fontWeight: 700,
              lineHeight: 1,
              display: "flex",
              filter: "drop-shadow(0 0 20px rgba(200, 170, 110, 0.3))",
              textShadow: "0 8px 20px rgba(0,0,0,0.8)",
            }}
          >
            {version}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
