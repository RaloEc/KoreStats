import { NextRequest, NextResponse } from "next/server";
import { patchService } from "@/services/riot/patchService";

export const dynamic = "force-dynamic"; // Ensure this route is not cached by default

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    // Simple Bearer token check
    // In production, this token should be stored in environment variables (e.g. CRON_SECRET)
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await patchService.checkForNewPatch(
      req.nextUrl.searchParams.get("force") === "true"
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in generic cron route:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
