import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import CreateProfileForm from "@/components/admin/CreateProfileForm";
import { deletePublicProfile } from "@/actions/admin-profiles";
import { Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Gestión de Perfiles Públicos",
};

export default async function AdminPublicProfilesPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles, error } = await supabase
    .from("public_profiles")
    .select(
      `
      *,
      summoner:summoners (
        summoner_name,
        summoner_level,
        tier,
        rank
      )
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Perfiles Públicos
          </h1>
          <p className="text-slate-400 mt-2">
            Gestiona los perfiles de Pro Players y Streamers destacados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Formulario de Creación */}
        <div className="lg:col-span-1">
          <CreateProfileForm />
        </div>

        {/* Columna Derecha: Listado */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-white">Perfiles Activos</h2>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-lg">
              Error cargando perfiles: {error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles?.map((profile: any) => (
              <div
                key={profile.id}
                className="group relative bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await deletePublicProfile(profile.id);
                    }}
                  >
                    <button
                      className="p-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <div className="flex items-start gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 ring-2 ring-slate-700 shrink-0">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-1">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate text-lg">
                        {profile.display_name}
                      </h3>
                      {profile.category === "pro_player" && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase">
                          PRO
                        </span>
                      )}
                      {profile.category === "streamer" && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20 uppercase">
                          Streamer
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 truncate mb-2">
                      {profile.summoner?.summoner_name || profile.slug}
                      {profile.team_name && (
                        <span className="text-slate-600">
                          {" "}
                          • {profile.team_name}
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {profile.summoner?.tier ? (
                          <span
                            className={
                              ["CHALLENGER", "grandmaster", "master"].includes(
                                profile.summoner.tier.toLowerCase(),
                              )
                                ? "text-yellow-500 font-bold"
                                : "text-slate-300"
                            }
                          >
                            {profile.summoner.tier} {profile.summoner.rank}
                          </span>
                        ) : (
                          "Sin Rank"
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(profile.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <Link
                    href={`/pro/${profile.slug}`}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Ver Página Pública <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span
                    className={`px-2 py-0.5 rounded-full ${profile.is_active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}
                  >
                    {profile.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            ))}

            {(!profiles || profiles.length === 0) && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-400">
                  No hay perfiles públicos creados aún.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
