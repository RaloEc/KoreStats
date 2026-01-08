import { NextRequest, NextResponse } from "next/server";
import { createCanvas, loadImage } from "canvas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const bgUrl = searchParams.get("bg");

  if (!version || !bgUrl) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  try {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Load background
    // Since bgUrl is external (ddragon), loadImage should handle it
    const image = await loadImage(bgUrl);

    // Draw background (cover)
    // Calculate aspect ratio to cover
    const scale = Math.max(width / image.width, height / image.height);
    const x = width / 2 - (image.width / 2) * scale;
    const y = height / 2 - (image.height / 2) * scale;
    ctx.drawImage(image, x, y, image.width * scale, image.height * scale);

    // Add gradient overlay (bottom heavy)
    const gradient = ctx.createLinearGradient(0, height / 2, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.5, "rgba(10, 16, 26, 0.7)"); // Dark blueish
    gradient.addColorStop(1, "rgba(10, 16, 26, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add Text
    ctx.textAlign = "center";

    // Title
    ctx.font = "bold 60px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText("NOTAS DEL PARCHE", width / 2, height - 160);

    // Version
    ctx.font = "bold 130px sans-serif";
    ctx.fillStyle = "#fbbf24"; // Amber-400
    ctx.fillText(version, width / 2, height - 40);

    // Branding
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("KORESTATS.COM", width / 2, 40);

    // Buffer
    const buffer = canvas.toBuffer("image/png");

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error generating patch image:", error);
    return new NextResponse("Error generating image", { status: 500 });
  }
}
