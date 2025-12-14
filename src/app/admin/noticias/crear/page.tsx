"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutoGuardarNoticia } from "@/hooks/useAutoGuardarNoticia";
import TiptapEditorLazy, {
  processEditorContent,
} from "@/components/TiptapEditorLazy"; // Lazy load: ssr: false
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
import { ArrowLeft, Save, Image as ImageIcon, Upload } from "lucide-react";
import {
  CategorySelector,
  type NoticiaCategory,
} from "@/components/noticias/CategorySelector";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { Dropzone } from "@/components/ui/dropzone";
import AdminProtection from "@/components/AdminProtection";

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
  hijos?: Categoria[]; // Mantener para compatibilidad
  subcategories?: Categoria[]; // Nueva propiedad para el selector
  nivel?: number; // Nivel jerárquico (1, 2, 3)
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
    })
    .optional(), // Hacer opcional temporalmente
  contenido: z.string().optional(), // Hacer opcional temporalmente
  categoria_ids: z.array(z.string()).optional(), // Hacer opcional temporalmente
  imagen_portada: z.string().optional(),
  autor: z.string().optional(),
  destacada: z.boolean().default(false),
});

function CrearNoticiaContent() {
  const [enviando, setEnviando] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState("Admin"); // Valor predeterminado
  const router = useRouter();
  const { user, session, profile } = useAuth(); // Usar el contexto de autenticación
  const { autoGuardar, isAutoSaving, lastSavedAt, noticiaId } =
    useAutoGuardarNoticia();
  const autoGuardarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      field.onChange([...field.value, categoriaId]);
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

  // Estado para almacenar el ID del usuario actual
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // Obtener información del usuario actual
  useEffect(() => {
    async function obtenerUsuario() {
      try {
        console.log(
          "Obteniendo información del usuario actual desde AuthContext..."
        );

        // Usar el usuario del contexto de autenticación en lugar de consultar directamente a Supabase
        if (!session || !user) {
          console.warn("No hay usuario autenticado en el contexto");

          // Intentar obtener la sesión usando el cliente del navegador como respaldo
          const supabaseBrowser = createClient();
          const {
            data: { user: supabaseUser },
            error: userError,
          } = await supabaseBrowser.auth.getUser();

          if (userError || !supabaseUser) {
            console.error(
              "Error al obtener usuario autenticado como respaldo:",
              userError
            );
            return;
          }

          console.log(
            "Usuario autenticado desde cliente respaldo:",
            supabaseUser.id,
            supabaseUser.email
          );
          setUsuarioId(supabaseUser.id);
          setNombreUsuario(supabaseUser.email || "Admin");
          return;
        }

        console.log("Usuario autenticado desde contexto:", user.id, user.email);
        // Guardar el ID del usuario
        setUsuarioId(user.id);

        // Usar la información del perfil que ya tenemos en el contexto
        if (profile && profile.username) {
          console.log("Usando nombre de usuario del perfil:", profile.username);
          setNombreUsuario(profile.username);
        } else if (user.email) {
          console.log("Usando email del contexto:", user.email);
          setNombreUsuario(user.email);
        } else if (session?.user?.email) {
          console.log("Usando email de la sesión:", session.user.email);
          setNombreUsuario(session.user.email);
        } else {
          console.log(
            "No se encontró nombre en el contexto, usando valor predeterminado"
          );
          setNombreUsuario("Admin");
        }
      } catch (error) {
        console.error("Error general al obtener usuario:", error);
        // En caso de error, establecer un valor predeterminado
        setNombreUsuario("Admin");
      }
    }

    obtenerUsuario();
  }, []);

  // Configurar el formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      contenido: "",
      categoria_ids: [],
      imagen_portada: "",
      autor: nombreUsuario,
      destacada: false,
    },
    mode: "onChange", // Cambiar a onChange para validación más suave
    reValidateMode: "onBlur", // Validar solo al salir del campo
  });

  // Función para manejar eventos que podrían causar desplazamiento
  const preventDefaultScroll = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Agregar manejadores de eventos para prevenir desplazamiento
  useEffect(() => {
    const editorElement = document.querySelector(".ProseMirror");
    if (editorElement) {
      editorElement.addEventListener("wheel", preventDefaultScroll, {
        passive: false,
      });
      editorElement.addEventListener("touchmove", preventDefaultScroll, {
        passive: false,
      });
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener("wheel", preventDefaultScroll);
        editorElement.removeEventListener("touchmove", preventDefaultScroll);
      }
    };
  }, []);

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

  // Actualizar el valor del autor cuando cambie nombreUsuario
  useEffect(() => {
    form.setValue("autor", nombreUsuario);
  }, [nombreUsuario, form]);

  // Auto-guardar cuando cambian los valores del formulario
  useEffect(() => {
    const subscription = form.watch((data) => {
      // Limpiar timeout anterior
      if (autoGuardarTimeoutRef.current) {
        clearTimeout(autoGuardarTimeoutRef.current);
      }

      // Establecer nuevo timeout para auto-guardar después de 3 segundos de inactividad
      autoGuardarTimeoutRef.current = setTimeout(() => {
        if (data.titulo && data.contenido && data.categoria_ids?.length > 0) {
          autoGuardar({
            id: noticiaId || undefined,
            titulo: data.titulo,
            contenido: data.contenido,
            imagen_portada: data.imagen_portada,
            categoria_ids: data.categoria_ids || [],
            destacada: data.destacada,
          });
        }
      }, 3000); // 3 segundos de inactividad
    });

    return () => {
      subscription.unsubscribe();
      if (autoGuardarTimeoutRef.current) {
        clearTimeout(autoGuardarTimeoutRef.current);
      }
    };
  }, [form, autoGuardar, noticiaId]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log("=== INICIO DEL PROCESO DE GUARDADO DE NOTICIA ===");
      setEnviando(true);

      // Validaciones finales antes de enviar
      if (!values.titulo || values.titulo.length < 5) {
        console.warn("Validación fallida: Título demasiado corto");
        alert("El título debe tener al menos 5 caracteres");
        setEnviando(false);
        return;
      }

      if (!values.contenido || values.contenido.length < 20) {
        console.warn("Validación fallida: Contenido demasiado corto");
        alert("El contenido debe tener al menos 20 caracteres");
        setEnviando(false);
        return;
      }

      if (!values.categoria_ids || values.categoria_ids.length === 0) {
        console.warn("Validación fallida: No se seleccionaron categorías");
        alert("Debes seleccionar al menos una categoría");
        setEnviando(false);
        return;
      }

      // Validar URL de imagen si está presente
      if (values.imagen_portada) {
        console.log(
          "Validando URL de imagen de portada:",
          values.imagen_portada
        );
        try {
          new URL(values.imagen_portada);
          console.log("URL de imagen válida");
        } catch (error) {
          console.error(
            "URL de imagen inválida:",
            values.imagen_portada,
            error
          );
          alert("La URL de la imagen no es válida");
          setEnviando(false);
          return;
        }
      } else {
        console.log("No se proporcionó imagen de portada");
      }

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
            `Imagen ${index + 1}: ${src?.substring(0, 100)}${
              src && src.length > 100 ? "..." : ""
            }`
          );

          // Verificar si la imagen es una URL de Supabase
          if (src && src.includes("supabase")) {
            console.log(`Imagen ${index + 1} parece ser una URL de Supabase`);
          } else if (src && src.startsWith("blob:")) {
            console.warn(
              `Imagen ${
                index + 1
              } es una URL de blob temporal que necesita ser procesada`
            );
          } else if (src && src.startsWith("data:")) {
            console.warn(
              `Imagen ${
                index + 1
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
                `Imagen ${
                  index + 1
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
      const datosNoticia = {
        titulo: values.titulo,
        contenido: values.contenido,
        imagen_portada: values.imagen_portada || null,
        autor: values.autor || nombreUsuario,
        autor_id: usuarioId, // Añadir el ID del usuario
        autor_nombre: nombreUsuario, // Añadir el nombre de usuario
        destacada: values.destacada,
        categoria_ids: values.categoria_ids,
      };

      console.log("Enviando datos de noticia:", {
        titulo: datosNoticia.titulo,
        contenido: datosNoticia.contenido?.substring(0, 100) + "...",
        imagen_portada: datosNoticia.imagen_portada,
        autor: datosNoticia.autor,
        categoria_ids: datosNoticia.categoria_ids,
        tamaño_contenido: datosNoticia.contenido?.length || 0,
      });

      console.log("Llamando a API Route para publicar noticia...");

      // Si ya existe un borrador, cambiar su estado a publicada
      if (noticiaId) {
        console.log("Cambiando estado de borrador a publicada...");
        const responseEstado = await fetch(
          "/api/admin/noticias/cambiar-estado?admin=true",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: noticiaId,
              estado: "publicada",
            }),
          }
        );

        if (!responseEstado.ok) {
          console.error("Error al cambiar estado a publicada");
          alert("Error al publicar la noticia");
          setEnviando(false);
          return;
        }

        console.log("Noticia publicada exitosamente");
        console.log("=== FIN DEL PROCESO DE PUBLICACIÓN ===");

        // Redirigir a la lista de noticias
        router.push("/admin/noticias");
        return;
      }

      // Si no existe borrador, crear noticia nueva y publicarla
      const response = await fetch("/api/admin/noticias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: values.titulo,
          contenido: values.contenido,
          autor: usuarioId,
          imagen_portada: values.imagen_portada || null,
          categoria_ids: values.categoria_ids || [],
          destacada: values.destacada || false,
          estado: "publicada", // Crear directamente como publicada
        }),
      });

      console.log(
        "Respuesta recibida de la API:",
        response.status,
        response.statusText
      );
      const resultado = await response.json();
      console.log("Datos de respuesta:", resultado);

      if (!response.ok) {
        console.error("Error al crear noticia:", resultado.error);
        alert(resultado.error || "Error al crear la noticia");
        setEnviando(false);
        return;
      }

      console.log(
        "Noticia creada y publicada exitosamente con ID:",
        resultado.id
      );
      console.log("=== FIN DEL PROCESO DE GUARDADO DE NOTICIA ===");

      // Si todo salió bien, redirigir a la lista de noticias
      router.push("/admin/noticias");
    } catch (error) {
      console.error("Error al crear noticia:", error);
      alert("Ocurrió un error al crear la noticia");
    } finally {
      setEnviando(false);
    }
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
            Crear Nueva Noticia
          </h1>
          <p className="text-muted-foreground">
            Añade una nueva noticia al sitio web
          </p>
        </div>

        <Card className="bg-card shadow-sm border rounded-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-4 sm:px-6 sm:py-6">
            <div>
              <CardTitle className="text-card-foreground">
                Crear Nueva Noticia
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Completa el formulario para crear una nueva noticia
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
                  className={`relative block h-7 w-12 rounded-full transition-colors [-webkit-tap-highlight-color:_transparent] ${
                    form.watch("destacada") ? "bg-primary" : "bg-input"
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
                    className={`absolute inset-y-0 start-0 m-1 size-5 rounded-full bg-background ring-[5px] ring-transparent transition-all ring-inset shadow-sm ${
                      form.watch("destacada")
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

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.push("/admin/noticias")}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={enviando || isAutoSaving}
                    className="gap-1"
                  >
                    {enviando ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        <span>
                          {noticiaId
                            ? "Publicar Noticia"
                            : "Guardar y Publicar"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CrearNoticia() {
  return (
    <AdminProtection>
      <CrearNoticiaContent />
    </AdminProtection>
  );
}
