import { NextRequest, NextResponse } from "next/server";
import { getTwitchLiveStatus } from "@/lib/social/twitch";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 1 minute

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  const username = params.username;

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 },
    );
  }

  const status = await getTwitchLiveStatus(username);

  if (!status) {
    return NextResponse.json(
      { isLive: false, error: "API_CONFIG_MISSING" },
      { status: 200 },
    );
  }

  return NextResponse.json(status);
}
