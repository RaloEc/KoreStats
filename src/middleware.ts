import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logger } from "@/lib/logger";

// Rutas que requieren autenticación de administrador (usando regex para mayor cobertura)
const ADMIN_ROUTES = [
  /^\/admin(?:\/|$)/, // /admin, /admin/, /admin/...
  /^\/api\/admin(?:\/|$)/, // /api/admin, /api/admin/, /api/admin/...
] as const;

// Rutas públicas que NO requieren autenticación (aunque estén bajo /api/admin)
const PUBLIC_API_ROUTES = [
  /^\/api\/admin\/news-ticker$/, // GET /api/admin/news-ticker es público
] as const;

/**
 * Verifica si una ruta es administrativa
 * @param pathname Ruta a verificar
 * @returns true si es una ruta administrativa
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => route.test(pathname));
}

/**
 * Verifica si una ruta es pública (no requiere autenticación)
 * @param pathname Ruta a verificar
 * @returns true si es una ruta pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => route.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  logger.info("Middleware", "Procesando ruta:", pathname);

  // ✅ Excluir rutas públicas del middleware de admin
  if (isPublicRoute(pathname)) {
    logger.info(
      "Middleware",
      "Ruta pública detectada, permitiendo acceso sin autenticación"
    );
    return NextResponse.next();
  }

  // Crear respuesta que será retornada
  // IMPORTANTE: Preservar headers personalizados del cliente (como x-user-id)
  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Crear cliente de Supabase para refrescar la sesión
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Actualizar cookies en request y response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ OPTIMIZADO: Usar getUser() para validar la sesión de forma segura
  // Esto refresca el token automáticamente si es necesario y valida contra la BD
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  logger.info("Middleware", "Estado de autenticación verificado", {
    hasUser: !!user,
    userId: user?.id,
    error: userError?.message,
  });

  // Nota: getUser() ya maneja la renovación del token si está expirado,
  // disparando las cookies actualizadas a través del callback setAll definido arriba.

  // Si hay usuario autenticado, agregar header para indicar al cliente
  if (user) {
    response.headers.set("X-Auth-Session", "true");
    response.headers.set("X-User-Id", user.id);
    logger.info("Middleware", "Sesión activa detectada (user validado)");
  }

  // Verificar si la ruta es administrativa
  const isAdmin = isAdminRoute(pathname);

  if (isAdmin) {
    // Si no hay usuario, redirigir al login con parámetro de redirección
    if (!user) {
      logger.warn(
        "Middleware",
        "No hay usuario autenticado, redirigiendo a login"
      );
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // ✅ OPTIMIZADO: Verificar role usando app_metadata (SIN consultar BD)
    // El role debe estar guardado en app_metadata durante el signup/update
    const userRole = user.app_metadata?.role as string | undefined;

    logger.info("Middleware", "Verificación de role (app_metadata)", {
      userId: user.id,
      role: userRole,
    });

    // Si no es admin en app_metadata, consultar la tabla perfiles como fallback
    if (userRole !== "admin") {
      logger.info(
        "Middleware",
        "Role no encontrado en app_metadata, consultando tabla perfiles..."
      );

      try {
        const { data: profile, error: profileError } = await supabase
          .from("perfiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile || profile.role !== "admin") {
          logger.warn(
            "Middleware",
            "Usuario no es admin en perfiles, redirigiendo a home"
          );
          return NextResponse.redirect(new URL("/", request.url));
        }

        logger.success(
          "Middleware",
          "Usuario es admin (verificado en perfiles), permitiendo acceso"
        );
      } catch (error) {
        logger.error("Middleware", "Error al consultar perfiles", error);
        return NextResponse.redirect(new URL("/", request.url));
      }
    } else {
      logger.success(
        "Middleware",
        "Usuario es admin (verificado en app_metadata), permitiendo acceso"
      );
    }
  }

  // Retornar la respuesta con las cookies actualizadas
  return response;
}

// Configurar las rutas en las que se ejecutará el middleware
export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - sw.js, workbox-*.js (Service Worker PWA)
     * - Archivos públicos (imágenes, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
