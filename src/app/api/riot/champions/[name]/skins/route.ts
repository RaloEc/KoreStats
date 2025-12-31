import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const { name } = params;

  if (!name) {
    return NextResponse.json({ skins: [] }, { status: 400 });
  }

  try {
    // Intentamos buscar por ID directo (ej: "Aatrox")
    const { data, error } = await supabase
      .from("lol_champions")
      .select("skins")
      .eq("id", name)
      .single();

    if (error) {
      console.error(`Error fetching skins for ${name}:`, error);
      return NextResponse.json({ skins: [] }, { status: 404 });
    }

    if (!data || !data.skins || !Array.isArray(data.skins)) {
      return NextResponse.json({ skins: [] });
    }

    // Extraemos solo los números de skin
    // as any[] porque el tipo JSONB no siempre se infiere bien directo
    const skinNums = (data.skins as any[])
      .map((s: any) => s.num)
      .filter((n) => typeof n === "number");

    return NextResponse.json({ skins: skinNums });
  } catch (err) {
    console.error("Internal error fetching skins:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
