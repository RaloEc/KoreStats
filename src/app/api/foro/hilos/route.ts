import { NextRequest, NextResponse } from "next/server";
import { getHilosForo } from "@/lib/foro/hilos-data";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tab: any =
      url.searchParams.get("tab") ||
      url.searchParams.get("tipo") ||
      "recientes";
    const timeRange = url.searchParams.get("timeRange") || "24h";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const buscar = url.searchParams.get("buscar") || "";
    const categoriaSlug = url.searchParams.get("categoriaSlug") || undefined;

    const result = await getHilosForo({
      tipo: tab,
      limit,
      page,
      pageSize: 10,
      buscar,
      categoriaSlug: categoriaSlug || undefined,
      timeRange,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en API de hilos del foro:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error.message,
        hilos: [],
        hasNextPage: false,
        total: 0,
      },
      { status: 500 }
    );
  }
}
