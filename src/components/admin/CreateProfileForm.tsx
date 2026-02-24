"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createPublicProfile } from "@/actions/admin-profiles";
import { User, Twitch, Youtube, Instagram, Save, Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Crear Perfil
        </>
      )}
    </button>
  );
}

export default function CreateProfileForm() {
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  async function clientAction(formData: FormData) {
    setMessage(null);
    const result = await createPublicProfile(formData);

    if (result?.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMessage({ text: "Perfil creado exitosamente", type: "success" });
      // Reset form if needed, though native form reset is manual usually
      // or we can reload via router.refresh but the action already revalidates.
      (
        document.getElementById("create-profile-form") as HTMLFormElement
      )?.reset();
    }
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          Nuevo Perfil Público
        </h3>
        <p className="text-sm text-slate-400">
          Registra un nuevo jugador profesional o streamer para seguimiento.
        </p>
      </div>

      <form
        id="create-profile-form"
        action={clientAction}
        className="space-y-6"
      >
        {/* Identidad Básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Riot ID
            </label>
            <input
              name="riotId"
              type="text"
              placeholder="Faker#KR1"
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
            />
            <p className="text-xs text-slate-500">
              Formato exacto: GameName#TAG
            </p>
          </div>

          {/* Region Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Región
            </label>
            <select
              name="region"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
              required
            >
              <option value="la1">LAN (LA1)</option>
              <option value="la2">LAS (LA2)</option>
              <option value="na1">NA (NA1)</option>
              <option value="euw1">EUW (EUW1)</option>
              <option value="kr">Korea (KR)</option>
              <option value="br1">Brazil (BR1)</option>
              <option value="eun1">EUNE (EUN1)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Slug Personalizado
            </label>
            <input
              name="slug"
              type="text"
              placeholder="faker (opcional)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
            />
            <p className="text-xs text-slate-500">
              Dejar en blanco para auto-generar desde el nombre.
            </p>
          </div>
        </div>

        {/* Clasificación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Categoría
            </label>
            <select
              name="category"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
            >
              <option value="pro_player">Pro Player</option>
              <option value="streamer">Streamer</option>
              <option value="high_elo">High Elo</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Rol Principal
            </label>
            <select
              name="mainRole"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
            >
              <option value="">-- Seleccionar --</option>
              <option value="TOP">Top</option>
              <option value="JUNGLE">Jungle</option>
              <option value="MID">Mid</option>
              <option value="BOTTOM">ADC</option>
              <option value="SUPPORT">Support</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Equipo / Org
            </label>
            <input
              name="teamName"
              type="text"
              placeholder="T1, G2, etc."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Multimedia */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
            Avatar URL
          </label>
          <input
            name="avatarUrl"
            type="url"
            placeholder="https://..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
          />
          <p className="text-xs text-slate-500">
            URL directa a una imagen (jpg, png). Si no se pone, se usará el
            icono de invocador.
          </p>
        </div>

        {/* Social Links */}
        <div className="space-y-3 pt-2 border-t border-slate-800/50">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider block">
            Redes Sociales
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <input
                name="twitter"
                type="text"
                placeholder="Usuario X (Twitter)"
                className="w-full pl-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                <Twitch className="w-4 h-4" />
              </div>
              <input
                name="twitch"
                type="text"
                placeholder="Canal de Twitch"
                className="w-full pl-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500">
                <Youtube className="w-4 h-4" />
              </div>
              <input
                name="youtube"
                type="text"
                placeholder="Canal de Youtube"
                className="w-full pl-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-pink-500">
                <Instagram className="w-4 h-4" />
              </div>
              <input
                name="instagram"
                type="text"
                placeholder="Usuario Instagram"
                className="w-full pl-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <div
            className={`p-4 rounded-md text-sm flex items-center gap-2 ${message.type === "error" ? "bg-red-900/50 text-red-200 border border-red-800" : "bg-green-900/50 text-green-200 border border-green-800"}`}
          >
            {message.type === "error" ? (
              <div className="w-2 h-2 rounded-full bg-red-500" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
