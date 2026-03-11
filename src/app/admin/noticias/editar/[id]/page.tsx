"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import type { Noticia } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutoGuardarNoticia } from "@/hooks/useAutoGuardarNoticia";
import TiptapEditorLazy, {
  processEditorContent,
} from "@/components/TiptapEditorLazy"; // Lazy load: ssr: false
import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  CategorySelector,
  type NoticiaCategory,
} from "@/components/noticias/CategorySelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Upload,
  Rocket,
  Gamepad2,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { Dropzone } from "@/components/ui/dropzone";
import AdminProtection from "@/components/AdminProtection";
import { FuentesListInput } from "@/components/admin/noticias/FuentesListInput";

// Tipo para las categorías
type Categoria = {
  id: string;
  nombre: string;
  parent_id?: string | null;
  slug?: string | null;
  descripcion?: string | null;
  orden?: number | null;
  color?: string | null;
  icono?: string | null;
  tipo?: string;
  hijos?: Categoria[];
  subcategories?: Categoria[]; // Nueva propiedad para el selector
  nivel?: number; // Nivel jerárquico (1, 2, 3)
};

// Tipo para juegos
type JuegoOption = {
  id: string;
  nombre: string;
  slug: string;
  icono_url: string | null;
};

// Esquema de validación
const formSchema = z.object({
  titulo: z
    .string()
    .min(5, {
      message: "El título debe tener al menos 5 caracteres",
    })
    .max(100, {
      message: "El título no puede tener más de 100 caracteres",
    }),
  contenido: z.string().min(20, {
    message: "El contenido debe tener al menos 20 caracteres",
  }),
  categoria_ids: z.array(z.string()).min(1, {
    message: "Selecciona al menos una categoría",
  }),
  imagen_portada: z.string().optional(),
  fuentes: z.array(z.string()).optional(),
  juego_id: z.string().optional(),
  destacada: z.boolean().default(false),
});

function EditarNoticiaContent({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [juegos, setJuegos] = useState<JuegoOption[]>([]);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string>("Admin");
  const [autoSaveReady, setAutoSaveReady] = useState(false);
  const router = useRouter();
  const { id } = params;

  // Configurar el formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      contenido: "",
      categoria_ids: [],
      imagen_portada: "",
      destacada: false,
      fuentes: [],
      juego_id: "",
    },
  });
  const { autoGuardar, isAutoSaving, lastSavedAt, noticiaId } =
    useAutoGuardarNoticia();
  const autoGuardarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-guardado con debounce de 3s
  useEffect(() => {
    if (!autoSaveReady) return;

    const subscription = form.watch((values) => {
      if (autoGuardarTimeoutRef.current) {
        clearTimeout(autoGuardarTimeoutRef.current);
      }

      autoGuardarTimeoutRef.current = setTimeout(() => {
        void autoGuardar({
          id,
          titulo: values.titulo || "",
          contenido: values.contenido || "",
          imagen_portada: values.imagen_portada || undefined,
          categoria_ids: values.categoria_ids || [],
          destacada: values.destacada,
          fuentes: values.fuentes,
          juego_id: values.juego_id,
        });
      }, 3000);
    });

    return () => {
      subscription.unsubscribe();
      if (autoGuardarTimeoutRef.current) {
        clearTimeout(autoGuardarTimeoutRef.current);
        const values = form.getValues();
        void autoGuardar({
          id,
          titulo: values.titulo || "",
          contenido: values.contenido || "",
          imagen_portada: values.imagen_portada || undefined,
          categoria_ids: values.categoria_ids || [],
          destacada: values.destacada,
          fuentes: values.fuentes,
          juego_id: values.juego_id,
        });
      }
    };
  }, [autoGuardar, form, id, autoSaveReady]);

  // Función para encontrar la categoría raíz de una categoría dada
  const findRootCategoria = (catId: string, currentCats: Categoria[]): Categoria | undefined => {
    const isCatInTree = (targetId: string, tree: Categoria[]): boolean => {
      for (const node of tree) {
        if (node.id === targetId) return true;
        const children = node.subcategories || node.hijos;
        if (children && children.length > 0 && isCatInTree(targetId, children)) return true;
      }
      return false;
    };

    for (const root of currentCats) {
      if (root.id === catId) return root;
      const subcats = root.subcategories || root.hijos;
      if (subcats && subcats.length > 0 && isCatInTree(catId, subcats)) {
        return root;
      }
    }
    return undefined;
  };

  // Función para manejar la selección de categorías
  const handleSeleccionarCategoria = (field: any, categoriaId: string) => {
    const isSelected = field.value?.includes(categoriaId);

    if (isSelected) {
      // Si ya está seleccionada, la quitamos
      const updatedCategories = field.value.filter(
        (catId: string) => catId !== categoriaId
      );
      field.onChange(updatedCategories);
    } else if (field.value.length < 4) {
      // Si no está seleccionada y no hemos llegado al límite, la añadimos
      const newCategories = [...field.value, categoriaId];
      field.onChange(newCategories);

      // Detección automática de juego si no hay uno seleccionado o es "none"
      const currentJuegoId = form.getValues("juego_id");
      if (!currentJuegoId || currentJuegoId === "none" || currentJuegoId === "") {
        const rootCat = findRootCategoria(categoriaId, categorias);
        if (rootCat) {
          // Buscar un juego cuyo nombre o slug coincida con la categoría seleccionada (o su raíz)
          const matchingJuego = juegos.find(j =>
            j.nombre.toLowerCase().includes(rootCat.nombre.toLowerCase()) ||
            rootCat.nombre.toLowerCase().includes(j.nombre.toLowerCase()) ||
            j.slug.toLowerCase().includes(rootCat.slug?.toLowerCase() || rootCat.nombre.toLowerCase())
          );
          if (matchingJuego) {
            form.setValue("juego_id", matchingJuego.id);
          }
        }
      }
    }
  };

  // Cargar categorías al iniciar
  useEffect(() => {
    async function cargarCategorias() {
      try {
        setCargandoCategorias(true);

        // Usar la API Route con soporte para jerarquía
        const response = await fetch("/api/admin/categorias?jerarquica=true");

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setCategorias(result.data);
        } else if (result.error) {
          console.error("Error al cargar categorías:", result.error);
        }
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      } finally {
        setCargandoCategorias(false);
      }
    }

    cargarCategorias();
  }, []);

  // Cargar juegos al iniciar
  useEffect(() => {
    async function cargarJuegos() {
      try {
        const { data, error } = await supabase
          .from("juegos")
          .select("id, nombre, slug, icono_url")
          .order("nombre");
        if (!error && data) {
          setJuegos(data);
        }
      } catch (error) {
        console.error("Error al cargar juegos:", error);
      }
    }
    cargarJuegos();
  }, [supabase]);

  // Obtener información del usuario actual
  useEffect(() => {
    async function obtenerUsuario() {
      try {
        console.log("Obteniendo información del usuario actual...");

        // Primero verificamos si hay una sesión activa
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error al obtener sesión:", sessionError);
          return;
        }

        if (!sessionData.session) {
          console.warn("No hay sesión activa");
          return;
        }

        // Si hay sesión, entonces obtenemos el usuario
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error al obtener usuario autenticado:", userError);
          return;
        }

        if (!user) {
          console.warn("No hay usuario autenticado");
          return;
        }

        console.log("Usuario autenticado:", user.id, user.email);
        // Guardar el ID del usuario
        setUsuarioId(user.id);

        // Usar la nueva API route para obtener el perfil del usuario
        console.log(
          "Consultando API para obtener perfil del usuario:",
          user.id
        );
        const response = await fetch(`/api/admin/perfil?userId=${user.id}`);

        if (!response.ok) {
          console.error(
            "Error al obtener perfil del usuario:",
            response.statusText
          );
          // Si hay error al obtener el perfil, usar el email como respaldo
          setNombreUsuario(user.email || "Admin");
          return;
        }

        const resultado = await response.json();

        if (!resultado.success || !resultado.data) {
          console.error(
            "Error en la respuesta de la API de perfil:",
            resultado.error
          );
          setNombreUsuario(user.email || "Admin");
          return;
        }

        const perfil = resultado.data;
        console.log("Perfil de usuario obtenido:", perfil);

        if (perfil && perfil.username) {
          // Usar el nombre de usuario si está disponible
          console.log("Usando nombre de usuario del perfil:", perfil.username);
          setNombreUsuario(perfil.username);
        } else if (perfil && perfil.nombre_completo) {
          // Si no hay username pero hay nombre completo, usarlo
          console.log(
            "Usando nombre completo del perfil:",
            perfil.nombre_completo
          );
          setNombreUsuario(perfil.nombre_completo);
        } else if (perfil && perfil.email) {
          // Si hay email en el perfil, usarlo
          console.log("Usando email del perfil:", perfil.email);
          setNombreUsuario(perfil.email);
        } else {
          // Si no hay perfil o username, usar el email o un valor predeterminado
          console.log(
            "No se encontró nombre en el perfil, usando email:",
            user.email
          );
          setNombreUsuario(user.email || "Admin");
        }
      } catch (error) {
        console.error("Error general al obtener usuario:", error);
        // En caso de error, establecer un valor predeterminado
        setNombreUsuario("Admin");
      }
    }

    obtenerUsuario();
  }, []);

  useEffect(() => {
    async function cargarNoticia() {
      try {
        setCargando(true);

        // Obtener la noticia de la API
        const response = await fetch(`/api/noticias/${id}`);
        const resultado = await response.json();

        if (!response.ok || !resultado.success) {
          console.error("Error al cargar noticia:", resultado.error);
          router.push("/admin/noticias");
          return;
        }

        const data = resultado.data;

        if (!data) {
          console.error("Noticia no encontrada");
          router.push("/admin/noticias");
          return;
        }

        // Guardar la noticia en el estado
        setNoticia(data);

        // Obtener los IDs de las categorías
        const categoriasSeleccionadas = data.categorias
          ? data.categorias.map((cat) => cat.id)
          : [];

        // Establecer los valores del formulario
        form.reset({
          titulo: data.titulo,
          contenido: data.contenido,
          categoria_ids: categoriasSeleccionadas,
          imagen_portada: data.imagen_portada || "",
          destacada: data.destacada || false,
          fuentes: data.fuentes || (data.fuente ? [data.fuente] : []),
          juego_id: data.juego_id || "",
        });

        // Habilitar autosave una vez cargados los datos iniciales
        setAutoSaveReady(true);

        // Establecer la vista previa de la imagen si existe
        if (data.imagen_portada) {
          setImagenPreview(data.imagen_portada);
        }
      } catch (error) {
        console.error("Error al cargar noticia:", error);
        router.push("/admin/noticias");
      } finally {
        setCargando(false);
      }
    }

    if (id) {
      cargarNoticia();
    }
  }, [id, router, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log("=== INICIO DEL PROCESO DE ACTUALIZACIÓN DE NOTICIA ===");
      setEnviando(true);

      // Analizar el contenido para buscar imágenes
      if (values.contenido) {
        console.log("Analizando contenido para detectar imágenes...");
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = values.contenido;
        const images = tempDiv.querySelectorAll("img");
        console.log(`Se encontraron ${images.length} imágenes en el contenido`);

        // Mostrar las URLs de las imágenes encontradas
        images.forEach((img, index) => {
          const src = img.getAttribute("src");
          console.log(
            `Imagen ${index + 1}: ${src?.substring(0, 100)}${src && src.length > 100 ? "..." : ""
            }`
          );

          // Verificar si la imagen es una URL de Supabase
          if (src && src.includes("supabase")) {
            console.log(`Imagen ${index + 1} parece ser una URL de Supabase`);
          } else if (src && src.startsWith("blob:")) {
            console.warn(
              `Imagen ${index + 1
              } es una URL de blob temporal que necesita ser procesada`
            );
          } else if (src && src.startsWith("data:")) {
            console.warn(
              `Imagen ${index + 1
              } es una URL de datos que necesita ser procesada`
            );
          }
        });

        // Procesar las imágenes temporales (blob URLs y data URLs) antes de guardar
        console.log("Procesando imágenes temporales antes de guardar...");
        try {
          const contentWithProcessedImages = await processEditorContent(
            values.contenido
          );
          console.log("Imágenes procesadas correctamente");
          values.contenido = contentWithProcessedImages;

          // Verificar que las imágenes se hayan procesado correctamente
          const tempDivAfter = document.createElement("div");
          tempDivAfter.innerHTML = values.contenido;
          const imagesAfter = tempDivAfter.querySelectorAll("img");
          let allProcessed = true;

          imagesAfter.forEach((img, index) => {
            const src = img.getAttribute("src");
            if (src && (src.startsWith("blob:") || src.startsWith("data:"))) {
              console.error(
                `Imagen ${index + 1
                } sigue siendo temporal después del procesamiento: ${src}`
              );
              allProcessed = false;
            }
          });

          if (!allProcessed) {
            console.warn(
              "Algunas imágenes no se procesaron correctamente. Intentando continuar de todos modos."
            );
          } else {
            console.log(
              "Todas las imágenes se procesaron correctamente a URLs permanentes"
            );
          }
        } catch (error) {
          console.error("Error al procesar imágenes:", error);
          alert(
            "Hubo un error al procesar las imágenes. Algunas imágenes podrían no mostrarse correctamente."
          );
          // Continuamos a pesar del error para no perder el contenido
        }
      }

      // Preparar datos para enviar a la API
      const datosActualizados = {
        id: id,
        titulo: values.titulo,
        contenido: values.contenido,
        imagen_portada: values.imagen_portada || null,
        autor: noticia?.autor || "Admin",
        autor_id: usuarioId, // Añadir el ID del usuario
        autor_nombre: nombreUsuario, // Añadir el nombre de usuario
        destacada: values.destacada,
        categoria_ids: values.categoria_ids,
        fuentes: values.fuentes,
        juego_id: values.juego_id,
      };

      // Usar la API para actualizar la noticia (utiliza el cliente de servicio)
      const response = await fetch("/api/admin/noticias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosActualizados),
      });

      const resultado = await response.json();

      if (!response.ok) {
        console.error("Error al actualizar noticia:", resultado.error);
        alert(
          `Error al actualizar la noticia: ${resultado.error || "Error desconocido"
          }`
        );
        setEnviando(false);
        return;
      }

      console.log("Noticia actualizada correctamente:", resultado);

      // Redirigir a la lista de noticias
      router.push("/admin/noticias");
    } catch (error) {
      console.error("Error al actualizar noticia:", error);
      alert("Error al actualizar la noticia. Por favor, inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function handlePublicar() {
    try {
      if (!confirm("¿Estás seguro de que quieres publicar esta noticia?")) {
        return;
      }

      setEnviando(true);

      const response = await fetch("/api/admin/noticias/cambiar-estado", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          estado: "publicada",
        }),
      });

      if (!response.ok) {
        throw new Error("Error al publicar la noticia");
      }

      alert("Noticia publicada correctamente");
      router.push("/admin/noticias");
    } catch (error) {
      console.error("Error al publicar:", error);
      alert("Error al publicar la noticia");
    } finally {
      setEnviando(false);
    }
  }

  // Manejar la carga de imagen
  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();

    // Validar URL si no está vacía
    if (url) {
      try {
        new URL(url);
        form.setValue("imagen_portada", url);
        setImagenPreview(url);
      } catch (error) {
        // URL inválida
        form.setValue("imagen_portada", "");
        setImagenPreview(null);
        alert("Por favor, introduce una URL de imagen válida");
      }
    } else {
      // URL vacía
      form.setValue("imagen_portada", "");
      setImagenPreview(null);
    }
  };

  // Subir archivo a Supabase Storage usando la API Route
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      // Mostrar indicador de carga o mensaje
      setEnviando(true);

      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append("file", file);

      // Usar nuestra API Route en lugar de Supabase directamente
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al subir la imagen");
      }

      // Actualizar el formulario con la URL de la imagen
      const publicUrl = result.data.url;
      form.setValue("imagen_portada", publicUrl);
      setImagenPreview(publicUrl);
    } catch (error) {
      console.error("Error al subir imagen:", error);
      alert(
        "Error al subir la imagen: " + (error.message || "Error desconocido")
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background min-h-screen px-2 py-4 md:px-5">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/noticias" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Editar Noticia
          </h1>
          <p className="text-muted-foreground">
            Modifica la información de la noticia
          </p>
        </div>

        <Card className="bg-card shadow-sm border rounded-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-4 sm:px-6 sm:py-6">
            <div>
              <CardTitle className="text-card-foreground">
                Información de la Noticia
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Actualiza los campos que desees modificar
              </CardDescription>
            </div>

            <div className="flex items-center gap-4">
              {/* Indicador de auto-guardado */}
              <div className="flex items-center gap-2 text-sm">
                {isAutoSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-muted-foreground">Guardando...</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground text-xs">
                      Guardado hace{" "}
                      {Math.floor((Date.now() - lastSavedAt.getTime()) / 1000) <
                        60
                        ? "unos segundos"
                        : Math.floor(
                          (Date.now() - lastSavedAt.getTime()) / 60000
                        ) + " min"}
                    </span>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Destacada</span>
                <label
                  htmlFor="toggleDestacadaHeader"
                  className={`relative block h-7 w-12 rounded-full transition-colors [-webkit-tap-highlight-color:_transparent] ${form.watch("destacada") ? "bg-primary" : "bg-input"
                    }`}
                >
                  <input
                    type="checkbox"
                    id="toggleDestacadaHeader"
                    className="peer sr-only"
                    checked={form.watch("destacada")}
                    onChange={(e) =>
                      form.setValue("destacada", e.target.checked)
                    }
                  />

                  <span
                    className={`absolute inset-y-0 start-0 m-1 size-5 rounded-full bg-background ring-[5px] ring-transparent transition-all ring-inset shadow-sm ${form.watch("destacada")
                      ? "start-6 w-2 bg-background"
                      : "bg-muted-foreground/20"
                      }`}
                  ></span>
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Título de la noticia"
                          className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Este será el título principal de la noticia
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contenido"
                  render={({ field }) => (
                    <div className="mb-4">
                      <FormLabel>Contenido</FormLabel>
                      <TiptapEditorLazy
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        className="border border-input rounded-lg px-4 py-3 text-foreground bg-background"
                      />
                      <FormMessage />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuentes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuentes (Opcional)</FormLabel>
                      <FormControl>
                        <FuentesListInput
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Indica de dónde proviene la información. Puedes añadir
                        múltiples fuentes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selector de Juego */}
                <FormField
                  control={form.control}
                  name="juego_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Gamepad2 className="h-4 w-4" />
                        Juego asociado (Opcional)
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-input">
                            <SelectValue placeholder="Sin juego (General)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin juego (General)</SelectItem>
                          {juegos.map((juego) => (
                            <SelectItem key={juego.id} value={juego.id}>
                              {juego.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Si la noticia es sobre un juego específico, selecciónalo aquí.
                        Aparecerá en la página del juego.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="categoria_ids"
                    render={({ field }) => (
                      <FormItem className="w-full md:col-span-2">
                        <FormLabel>Categorías</FormLabel>
                        <FormControl>
                          <div className="space-y-2 w-full">
                            {cargandoCategorias ? (
                              <div className="text-sm text-muted-foreground">
                                Cargando categorías...
                              </div>
                            ) : categorias.length > 0 ? (
                              <div className="border border-input bg-muted/40 rounded-md p-4 max-h-[400px] overflow-y-auto">
                                <CategorySelector
                                  categories={categorias.map((cat) => ({
                                    id: cat.id,
                                    nombre: cat.nombre,
                                    color: cat.color || undefined,
                                    descripcion: cat.descripcion || undefined,
                                    subcategories:
                                      cat.subcategories?.map((subcat) => ({
                                        id: subcat.id,
                                        nombre: subcat.nombre,
                                        color: subcat.color || undefined,
                                        descripcion:
                                          subcat.descripcion || undefined,
                                        subcategories:
                                          subcat.subcategories?.map(
                                            (subsubcat) => ({
                                              id: subsubcat.id,
                                              nombre: subsubcat.nombre,
                                              color:
                                                subsubcat.color || undefined,
                                              descripcion:
                                                subsubcat.descripcion ||
                                                undefined,
                                            })
                                          ) || [],
                                      })) || [],
                                  }))}
                                  selectedCategoryIds={field.value || []}
                                  onSelectCategory={(id) =>
                                    handleSeleccionarCategoria(field, id)
                                  }
                                  maxSelection={4}
                                  showSelectedBadges={true}
                                />
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No hay categorías disponibles
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Selecciona hasta 4 categorías para esta noticia
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imagen_portada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen destacada</FormLabel>
                      <FormControl>
                        <div>
                          <Dropzone
                            previewUrl={imagenPreview}
                            onFileSelect={handleFileUpload}
                            label="Arrastra y suelta o haz clic para subir una imagen"
                            id="imagen-noticia"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Sube una imagen arrastrándola, haciendo clic o pegándola
                        desde el portapapeles (Ctrl+V)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 border-t mt-8">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => router.push("/admin/noticias")}
                    className="w-full sm:w-auto text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span>Cancelar</span>
                  </Button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {noticia?.estado === "borrador" && (
                      <Button
                        type="button"
                        variant="default"
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 px-6"
                        onClick={handlePublicar}
                        disabled={enviando}
                      >
                        <Rocket className="h-4 w-4" />
                        <span>Publicar ahora</span>
                      </Button>
                    )}

                    <Button
                      type="submit"
                      disabled={enviando || isAutoSaving}
                      className="flex-1 sm:flex-none relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 dark:from-indigo-500 dark:to-violet-600 dark:hover:from-indigo-400 dark:hover:to-violet-500 text-white font-bold tracking-wide shadow-xl shadow-indigo-500/20 dark:shadow-indigo-900/40 transition-all duration-300 hover:scale-[1.05] hover:shadow-indigo-500/40 active:scale-[0.95] gap-2 px-8 py-6 rounded-xl group"
                    >
                      {/* Efecto de brillo al pasar el mouse */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {enviando ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                          <span className="animate-pulse">Guardando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 relative z-10">
                          <Save className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                          <span>Guardar cambios</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditarNoticia({ params }: { params: { id: string } }) {
  return (
    <AdminProtection>
      <EditarNoticiaContent params={params} />
    </AdminProtection>
  );
}
