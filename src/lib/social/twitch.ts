import { createClient } from "@/lib/supabase/server";

interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getTwitchAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn(
      "[Twitch API] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET",
    );
    return null;
  }

  // Check cache
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Failed to get Twitch token: ${response.statusText}`);
    }

    const data: TwitchToken = await response.json();
    cachedToken = data.access_token;
    // Buffer of 60 seconds
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return cachedToken;
  } catch (error) {
    console.error("[Twitch API] Error getting access token:", error);
    return null;
  }
}

export async function getTwitchLiveStatus(username: string) {
  const token = await getTwitchAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!token || !clientId) return null;

  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${username}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.statusText}`);
    }

    const data = await response.json();
    const stream = data.data?.[0] || null;

    if (!stream) return { isLive: false };

    return {
      isLive: true,
      title: stream.title,
      viewerCount: stream.viewer_count,
      startedAt: stream.started_at,
      gameName: stream.game_name,
      thumbnailUrl: stream.thumbnail_url?.replace(
        "{width}x{height}",
        "1280x720",
      ),
    };
  } catch (error) {
    console.error(`[Twitch API] Error fetching status for ${username}:`, error);
    return null;
  }
}
