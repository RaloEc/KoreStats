import { NextResponse } from "next/server";
import { getNoticias } from "@/lib/noticias/noticias-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function configurarCORS(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export async function OPTIONS(request: Request) {
  const response = NextResponse.json({}, { status: 200 });
  return configurarCORS(response);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get("admin") === "true";
    const tipo = (searchParams.get("tipo") || "").toLowerCase();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);
    const busqueda = searchParams.get("busqueda") || "";
    const autor = searchParams.get("autor") || "";
    const ordenFecha = searchParams.get("ordenFecha") || "desc";
    const categoria = searchParams.get("categoria") || "";
    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, limitParam)
      : undefined;

    const result = await getNoticias({
      tipo,
      limit,
      page,
      pageSize,
      busqueda,
      autor,
      ordenFecha,
      categoria,
      isAdmin,
    });

    const response = NextResponse.json({
      success: true,
      ...result,
    });

    return configurarCORS(response);
  } catch (error) {
    console.error("API Error", error);
    const response = NextResponse.json({
      success: true, // Mantener fallback
      data: [],
    });
    return configurarCORS(response);
  }
}
