"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Wand2,
  Save,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Minus,
  Sparkles,
} from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import LolPatchContent from "@/components/noticias/LolPatchContent";
import { useAuth } from "@/context/AuthContext";

export default function PatchGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [version, setVersion] = useState("");
  const [inputText, setInputText] = useState("");
  const [analysisImageUrl, setAnalysisImageUrl] = useState(""); // Únicamente para análisis IA
  const [coverImageUrl, setCoverImageUrl] = useState(""); // Para la portada de la noticia
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Nuevo estado para la carga
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setAnalysisImageUrl(result.data.url);
      } else {
        alert(
          "Error al subir la imagen: " + (result.error || "Error desconocido"),
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error en la subida.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText) return;

    try {
      setIsAnalyzing(true);
      const res = await fetch("/api/admin/lol-patch-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          imageUrl: analysisImageUrl, // Enviar imagen al backend para análisis IA
          version: version || "Preview",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error desconocido en el servidor");
      }

      if (
        json.data &&
        (json.data.champions?.length > 0 || json.data.items?.length > 0)
      ) {
        setPreviewData(json.data);
      } else {
        alert(
          "La IA analizó el contenido pero no detectó cambios específicos en campeones o ítems. Revisa el texto e imagen.",
        );
      }
    } catch (error: any) {
      console.error(error);
      alert("Error analizando: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!previewData) return;

    try {
      setIsSaving(true);

      const payload = {
        titulo: `Notas del Parche ${version || "Preview"}`,
        contenido: `<p>Resumen del parche ${version || "Preview"}. Más detalles a continuación.</p>`, // Contenido HTML mínimo requerido
        imagen_portada: coverImageUrl || null,
        type: "lol_patch",
        data: previewData,
        estado: "borrador",
        autor_id: user?.id,
        slug: `parche-${(version || "preview-" + Date.now()).replace(/\./g, "-")}`,
        categoria_ids: [], // Opcional, o forzar una categoría "Actualizaciones"
        destacada: true,
      };

      const res = await fetch("/api/admin/noticias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Borrador creado exitosamente!");
        // Redirigir a editar para que puedan añadir más texto si quieren
        router.push(`/admin/noticias/editar/${result.data.id}`);
      } else {
        alert("Error guardando borrador: " + JSON.stringify(result.error));
      }
    } catch (error) {
      console.error(error);
      alert("Error guardando borrador.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateCover = () => {
    if (
      !previewData ||
      !previewData.champions ||
      previewData.champions.length === 0
    ) {
      alert("Primero analiza un parche para obtener campeones.");
      return;
    }

    // 1. Elegir campeón random
    const randomChamp =
      previewData.champions[
        Math.floor(Math.random() * previewData.champions.length)
      ];

    // 2. Elegir skin random (si hay skins) o default
    // Nota: El backend ahora debe devolver las skins en el objeto champ
    let splashUrl = "";
    if (randomChamp.skins && randomChamp.skins.length > 0) {
      // Excluir la default si queremos variedad, o incluirla
      const randomSkin =
        randomChamp.skins[Math.floor(Math.random() * randomChamp.skins.length)];
      splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${randomChamp.id}_${randomSkin.num}.jpg`;
    } else {
      splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${randomChamp.id}_0.jpg`;
    }

    // 3. Generar URL de OG Image internal
    // Construimos la URL. Asumimos que tenemos /api/og/patch
    // codificamos bg con la splash url
    const apiUrl = `/api/og/patch?version=${version || "Preview"}&bg=${encodeURIComponent(splashUrl)}`;

    // ESTO es lo que guardaremos como imagen de portada.
    // Al ser una URL dinámica, Next la generará on-demand.
    // Opcional: Podríamos tener un "preview" real aquí renderizando la imagen.
    setCoverImageUrl(apiUrl);
  };

  return (
    <div className="space-y-6 bg-background min-h-screen px-2 py-4 md:px-5">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/noticias" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Generador de Parche Manual
          </h1>
          <p className="text-muted-foreground">
            Pega el texto del Tweet/Post de Riot y genera una noticia
            interactiva.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* INPUT COLUMN */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>
                  Introduce los datos básicos del parche.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Versión del Parche</Label>
                    <Input
                      placeholder="Ej: 26.03"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagen del Parche (Subir o URL)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={analysisImageUrl}
                        onChange={(e) => setAnalysisImageUrl(e.target.value)}
                        className="flex-1"
                      />
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Subir imagen"
                      >
                        {isUploading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {analysisImageUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted mt-2 group">
                        <img
                          src={analysisImageUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setAnalysisImageUrl("")}
                          >
                            Quitar Imagen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Portada de la Noticia
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateCover}
                        disabled={!previewData}
                        title="Generar usando un splash aleatorio de los campeones detectados"
                        className="text-xs"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Generar Auto
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL de la portada generada o manual..."
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {coverImageUrl && (
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-[2/1] relative">
                        <img
                          src={coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6"
                            onClick={() => setCoverImageUrl("")}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contenido del Tweet / Texto</Label>
                  <Textarea
                    placeholder="Pega aquí el texto... Ej:
CHAMPION BUFFS
Ahri: W CD 10-6 -> 9-5
Bel'Veth: Q Damage increased..."
                    className="h-[400px] font-mono text-sm"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (!inputText && !analysisImageUrl)}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Analizar y Generar Preview
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* PREVIEW COLUMN */}
          <div className="space-y-6">
            <Card className="h-full border-dashed bg-muted/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Previsualización en Vivo</CardTitle>
                  {previewData && (
                    <Button onClick={handleSaveDraft} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Guardando..." : "Crear Borrador"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {previewData ? (
                  <div className="border rounded-xl p-0 bg-background shadow-lg overflow-visible">
                    <div className="p-4 border-b bg-muted/30 rounded-t-xl">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        Previsualización del Parche
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Así es como los usuarios verán la noticia publicada.
                      </p>
                    </div>
                    <div className="p-4">
                      <LolPatchContent data={previewData} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-4">
                    <Wand2 className="h-12 w-12 mb-4 opacity-20" />
                    <p>
                      Ingresa el texto y presiona analizar para ver el resultado
                      aquí.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
