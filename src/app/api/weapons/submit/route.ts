import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/weapons/submit
 *
 * Allows an authenticated user to submit a new weapon with a share code.
 * If weaponStatsRecordId is provided, updates the share_code on the existing record.
 * Otherwise, creates a new weapon_stats_record with the share_code.
 *
 * Share code formats (multilingual):
 *   "CI-19 Assault Rifle-Warfare-6HLOAN009MFFCME3G7LT2"
 *   "Fusil de asalto CI-19-Conflicto Bélico-6JA8N0G042GD275H1UJK8"
 *   "G3 Battle Rifle-Operations-6G8S9T800CP7E0UB1CE6S"
 *   "Fusil de asalto SG 552-Operación: Extracción-6I01HMC07EGMI0QF5UDC0"
 */

// ─── Game Mode Keywords ───────────────────────────────────────────────────────

const WARFARE_KEYWORDS = [
  // English
  "warfare", "warzone", "conflict",
  // Spanish
  "conflicto bélico", "conflicto belico", "guerra total", "guerra",
];

const OPERATIONS_KEYWORDS = [
  // English
  "operations", "operation", "extraction", "ops",
  // Spanish  
  "operación", "operacion", "operaciones", "extracción", "extraccion",
  "operación: extracción", "operacion: extraccion",
];

/**
 * Detects the game mode from a share code string.
 * The mode keyword usually appears between the weapon name and the hash code.
 */
function detectGameMode(shareCode: string): "operations" | "warfare" {
  // Normalize: lowercase + strip accents for comparison
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const lower = normalize(shareCode);

  for (const kw of WARFARE_KEYWORDS) {
    if (lower.includes(normalize(kw))) return "warfare";
  }

  for (const kw of OPERATIONS_KEYWORDS) {
    if (lower.includes(normalize(kw))) return "operations";
  }

  // Default to operations if no keyword is found
  return "operations";
}

/**
 * Extracts a clean weapon model name from a share code string.
 *
 * Share code format: "WeaponName-GameModeKeyword-HashCode"
 *
 * Steps:
 *  1. Remove the hash code (last segment, 10+ uppercase alphanumeric chars).
 *  2. Remove the game mode keyword (now the last segment).
 *  3. Remove common Spanish weapon type prefixes to reveal the model ID.
 *
 * Examples:
 *   "CI-19 Assault Rifle-Warfare-6HLOAN009MFFCME3G7LT2"   → "CI-19"
 *   "Fusil de asalto CI-19-Conflicto Bélico-6JA8N0G..."   → "CI-19"
 *   "G3 Battle Rifle-Operations-6G8S9T800CP7E0UB1CE6S"    → "G3"
 *   "Fusil de asalto SG 552-Operación: Extracción-6I01..."→ "SG 552"
 */
function extractWeaponName(shareCode: string): string | null {
  if (!shareCode) return null;

  // Step 1: Remove trailing hash (last dash-separated segment of 10+ uppercase alphanumeric chars)
  let clean = shareCode.replace(/-[A-Z0-9]{10,}$/, "").trim();
  if (!clean) return null;

  // Step 2: Remove the game mode keyword segment from the end
  const allModeKeywords = [...WARFARE_KEYWORDS, ...OPERATIONS_KEYWORDS];
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const kw of allModeKeywords) {
    const kwNorm = normalize(kw);
    // Try to match "-keyword" (with optional extra text) at the end, case insensitive
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`-${escaped}[^-]*$`, "i");
    const candidate = clean.replace(regex, "").trim();
    // Also try normalized comparison
    if (candidate.length < clean.length) {
      clean = candidate;
      break;
    }
    // Fallback: check if normalized version is at end
    const cleanNorm = normalize(clean);
    const idx = cleanNorm.lastIndexOf("-" + kwNorm);
    if (idx !== -1 && idx > cleanNorm.length / 2) {
      clean = clean.substring(0, idx).trim();
      break;
    }
  }

  // Step 3: Remove common weapon type prefixes to extract the model identifier
  const prefixes = [
    // Spanish
    "fusil de asalto",
    "fusil de batalla",
    "ametralladora ligera",
    "ametralladora",
    "subametralladora",
    "subfusil",
    "rifle de francotirador",
    "pistola",
    "escopeta",
    "rifle de asalto",
    "fusil francotirador",
    "lanzacohetes",
    "rifle de batalla",
    "rifle de precisión",
    "fusil",
    // English
    "assault rifle",
    "battle rifle",
    "light machine gun",
    "submachine gun",
    "sniper rifle",
    "marksman rifle",
    "pistol",
    "shotgun",
    "handgun",
    "smg",
    "lmg",
    "ar",
  ];

  for (const prefix of prefixes) {
    const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    const candidate = clean.replace(regex, "").trim();
    if (candidate && candidate.length < clean.length) {
      clean = candidate;
      break;
    }
  }

  return clean || null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shareCode, weaponStatsRecordId, description } = body;

    if (!shareCode || typeof shareCode !== "string") {
      return NextResponse.json(
        { error: "shareCode is required" },
        { status: 400 }
      );
    }

    const trimmedCode = shareCode.trim();
    const detectedMode = detectGameMode(trimmedCode);
    const serviceSupabase = getServiceClient();

    if (weaponStatsRecordId) {
      const weaponName = extractWeaponName(trimmedCode);
      
      // Update existing record — also refresh game_mode and weapon_name 
      // in case the AI OCR result was inaccurate but the share code is perfect.
      const { data, error } = await serviceSupabase
        .from("weapon_stats_records")
        .update({
          share_code: trimmedCode,
          game_mode: detectedMode,
          description: description || null,
          ...(weaponName ? { weapon_name: weaponName } : {}),
        })
        .eq("id", weaponStatsRecordId)
        .eq("user_id", user.id)
        .select("id, share_code, game_mode, description")
        .single();

      if (error) {
        console.error("[weapons/submit] Update error:", error);
        return NextResponse.json(
          { error: "Failed to update share code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, record: data, detected_mode: detectedMode });
    } else {
      const weaponName = extractWeaponName(trimmedCode);

      const { data, error } = await serviceSupabase
        .from("weapon_stats_records")
        .insert({
          user_id: user.id,
          weapon_name: weaponName,
          share_code: trimmedCode,
          game_mode: detectedMode,
          stats: {},
        })
        .select("id, weapon_name, share_code, game_mode")
        .single();

      if (error) {
        console.error("[weapons/submit] Insert error:", error);
        return NextResponse.json(
          { error: "Failed to create weapon record" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, record: data, detected_mode: detectedMode });
    }
  } catch (error) {
    console.error("[weapons/submit] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
