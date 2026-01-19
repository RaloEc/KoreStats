import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Variable para almacenar la instancia del cliente de servicio
let serviceClientInstance: ReturnType<typeof createClient> | null = null;

// Detectar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined";

// Cliente principal de Supabase - NOTA: Preferir @/lib/supabase/client para cliente del navegador
// Este export existe solo por compatibilidad con código legacy
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    flowType: "pkce",
  },
  global: {
    headers: {
      "x-application-name": "korestats",
    },
  },
});

// Función para obtener el cliente de servicio (para operaciones administrativas)
export const getServiceClient = () => {
  try {
    // Si ya existe una instancia, la devolvemos
    if (serviceClientInstance) {
      return serviceClientInstance;
    }

    // Obtener la clave de servicio
    let serviceKey = process.env.SUPABASE_SERVICE_KEY;

    // Verificar si la clave de servicio está disponible y es válida
    if (!serviceKey || serviceKey.length < 30) {
      console.warn(
        "SUPABASE_SERVICE_KEY no válida, intentando con NEXT_PUBLIC_SUPABASE_SERVICE_KEY",
      );
      serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
    }

    // Si ninguna clave de servicio es válida, usar la clave anónima como último recurso
    if (!serviceKey || serviceKey.length < 30) {
      console.warn(
        "No se encontró una clave de servicio válida, usando clave anónima (esto puede causar problemas con RLS)",
      );
      serviceKey = supabaseAnonKey;
    }

    // Verificar que tenemos una URL válida
    if (!supabaseUrl || supabaseUrl.length < 10) {
      console.error("URL de Supabase no válida");
      // En caso de error, devolvemos el cliente normal como último recurso
      return supabase;
    }

    console.log(
      `Creando cliente de servicio de Supabase con URL: ${supabaseUrl}`,
    );

    // Crear nueva instancia y guardarla
    serviceClientInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
      global: {
        headers: {
          "x-application-name": "korestats-admin", // Identificador para depuración
        },
      },
    });

    // Verificar que la instancia se creó correctamente
    if (!serviceClientInstance) {
      console.error(
        "No se pudo crear el cliente de servicio, usando cliente normal como fallback",
      );
      return supabase;
    }

    return serviceClientInstance;
  } catch (error) {
    console.error("Error al crear cliente de servicio de Supabase:", error);
    // En caso de error, devolvemos el cliente normal como último recurso
    return supabase;
  }
};

// Función para verificar la conexión a Supabase
export const checkSupabaseConnection = async () => {
  try {
    // Intenta hacer una consulta simple para verificar la conexión
    const { error } = await supabase.from("perfiles").select("id").limit(1);

    if (error) {
      console.error("Error al verificar conexión con Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error al verificar conexión con Supabase:", error);
    return { success: false, error: error.message };
  }
};
