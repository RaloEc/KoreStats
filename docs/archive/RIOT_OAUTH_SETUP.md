# Configuración de OAuth 2.0 con Riot Games (RSO)

## 📋 Descripción General

Este documento explica cómo configurar la autenticación OAuth 2.0 con Riot Games para vincular cuentas de League of Legends a tu aplicación.

## 🔑 Obtener Credenciales de Riot

### 1. Registrar tu Aplicación

1. Ve a [Riot Developer Portal](https://developer.riotgames.com/)
2. Inicia sesión con tu cuenta de Riot Games
3. Crea una nueva aplicación
4. Completa el formulario con información sobre tu aplicación

### 2. Obtener Credenciales RSO

Después de registrar tu aplicación, obtendrás:

- **RIOT_CLIENT_ID**: ID único de tu aplicación
- **RIOT_CLIENT_SECRET**: Secreto de tu aplicación (MANTÉN ESTO PRIVADO)

### 3. Configurar Redirect URI

En la configuración de tu aplicación, añade el URI de callback:

**Desarrollo Local:**

```
http://localhost:3000/api/riot/callback
```

**Producción:**

```
https://tudominio.com/api/riot/callback
```

## 🔧 Configuración de Variables de Entorno

Añade las siguientes variables a tu archivo `.env.local`:

```env
# Riot Games OAuth 2.0 (RSO)
RIOT_CLIENT_ID=tu_client_id_aqui
RIOT_CLIENT_SECRET=tu_client_secret_aqui
RIOT_REDIRECT_URI=http://localhost:3000/api/riot/callback

# Riot Games API
RIOT_API_KEY=tu_api_key_aqui
```

## 📁 Estructura de Archivos

```
src/
├── app/
│   └── api/
│       └── riot/
│           ├── login/
│           │   └── route.ts          # GET /api/riot/login
│           └── callback/
│               └── route.ts          # GET /api/riot/callback
├── lib/
│   └── riot/
│       └── oauth.ts                  # Utilidades de OAuth
└── types/
    └── riot.ts                       # Tipos TypeScript
```

## 🔄 Flujo de Autenticación

### 1. Usuario inicia sesión con Riot

```
Usuario → GET /api/riot/login
         → Redirige a https://auth.riotgames.com/authorize?...
         → Usuario autoriza en Riot
         → Riot redirige a GET /api/riot/callback?code=...
```

### 2. Intercambio de Código

```
Backend → POST https://auth.riotgames.com/token
        ← access_token, refresh_token
```

### 3. Obtener Información del Jugador

```
Backend → GET https://americas.api.riotgames.com/riot/account/v1/accounts/me
        ← puuid, game_name, tag_line
```

### 4. Guardar en Base de Datos

```
Backend → UPSERT linked_accounts_riot
        ← Cuenta vinculada exitosamente
        → Redirige a /perfil?riot_success=true
```

## 🚀 Uso

### Botón de Login en Frontend

```tsx
import Link from "next/link";

export function RiotLoginButton() {
  return (
    <Link href="/api/riot/login">
      <button>Vincular Cuenta de Riot</button>
    </Link>
  );
}
```

### Verificar Cuenta Vinculada

```tsx
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";

export function RiotAccountInfo() {
  const { user } = useAuth();

  const { data: riotAccount } = useQuery({
    queryKey: ["riot-account", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/riot/account");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!user?.id,
  });

  if (!riotAccount) {
    return <p>No hay cuenta de Riot vinculada</p>;
  }

  return (
    <div>
      <p>
        Jugador: {riotAccount.game_name}#{riotAccount.tag_line}
      </p>
      <p>Región: {riotAccount.region}</p>
    </div>
  );
}
```

## 📚 Endpoints Disponibles

### GET /api/riot/login

Redirige al usuario a la página de autorización de Riot.

**Parámetros:** Ninguno

**Respuesta:** Redirección a `https://auth.riotgames.com/authorize?...`

### GET /api/riot/callback

Callback de Riot. Intercambia el código por tokens y guarda la cuenta vinculada.

**Parámetros:**

- `code` (query): Código de autorización
- `state` (query): Estado para validar CSRF
- `error` (query, opcional): Error de Riot

**Respuesta:** Redirección a `/perfil?riot_success=true` o `/perfil?riot_error=...`

## 🔒 Seguridad

### Mejores Prácticas Implementadas

1. **HTTP Basic Auth**: Las credenciales se envían en el header `Authorization`
2. **HTTPS**: Todas las solicitudes a Riot usan HTTPS
3. **State Parameter**: Previene ataques CSRF
4. **RLS en Base de Datos**: Los usuarios solo ven sus propias cuentas
5. **Service Role**: Se usa para operaciones administrativas

### Recomendaciones Adicionales

1. **Almacenar State en Sesión**: En producción, almacena el state en una sesión o base de datos
2. **Validar Redirect URI**: Asegúrate de que el redirect URI coincida exactamente
3. **Rotar Secretos**: Cambia regularmente tu `RIOT_CLIENT_SECRET`
4. **Monitorear Logs**: Revisa los logs para detectar intentos de acceso no autorizados

## 🐛 Troubleshooting

### Error: "RIOT_CLIENT_ID no está configurado"

**Solución:** Asegúrate de que las variables de entorno están en `.env.local`

```env
RIOT_CLIENT_ID=tu_valor_aqui
RIOT_CLIENT_SECRET=tu_valor_aqui
RIOT_REDIRECT_URI=http://localhost:3000/api/riot/callback
```

### Error: "Token exchange failed"

**Posibles causas:**

- `RIOT_CLIENT_SECRET` incorrecto
- `RIOT_REDIRECT_URI` no coincide con el registrado
- El código ha expirado (válido por 10 minutos)

### Error: "Failed to get player info"

**Posibles causas:**

- Access token inválido o expirado
- El usuario no tiene una cuenta de League of Legends
- Problema de conectividad con la API de Riot

## 📖 Referencias

- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot RSO Documentation](https://developer.riotgames.com/docs/rso)
- [Riot Account API](https://developer.riotgames.com/apis#accounts)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)

## 📝 Notas

- El scope `openid` es **obligatorio** para obtener el PUUID
- El PUUID es el identificador único universal de Riot
- Los tokens tienen una duración limitada (típicamente 1 hora)
- El refresh token se puede usar para obtener nuevos access tokens

## 🔄 Próximos Pasos

1. ✅ Configurar variables de entorno
2. ✅ Crear endpoints de OAuth
3. ⏳ Crear componentes frontend para vincular cuentas
4. ⏳ Implementar obtención de estadísticas del jugador
5. ⏳ Crear dashboard con información de League of Legends
