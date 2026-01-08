# Sistema de Cuentas Conectadas

## Descripción General

Sistema completo para que los usuarios conecten sus cuentas de redes sociales y plataformas de juegos (Twitch, Discord, League of Legends, Valorant, Kick, Delta Force) en sus perfiles.

## Componentes Creados

### 1. **Migración SQL** (`20250112_add_connected_accounts.sql`)
- Agrega columna `connected_accounts` a tabla `perfiles`
- Tipo: `JSONB` con valor por defecto `{}`
- Incluye índice GIN para búsquedas eficientes

**Estructura del JSON:**
```json
{
  "twitch": "usuario_twitch",
  "discord": "usuario#1234",
  "league_of_legends": "NombreJugador",
  "valorant": "Usuario#TAG",
  "kick": "usuario_kick",
  "delta_force": "usuario_df"
}
```

### 2. **Hook `useConnectedAccounts.ts`**
Gestiona toda la lógica de cuentas conectadas:

**Funciones:**
- `fetchAccounts()` - Carga cuentas del usuario
- `addOrUpdateAccount(platform, username)` - Agrega o actualiza una cuenta
- `removeAccount(platform)` - Elimina una cuenta
- `PLATFORM_LABELS` - Etiquetas de plataformas
- `PLATFORM_PLACEHOLDERS` - Placeholders de ejemplo

**Tipos:**
```typescript
type AccountPlatform = 'twitch' | 'discord' | 'league_of_legends' | 'valorant' | 'kick' | 'delta_force'
type ConnectedAccountsData = Partial<Record<AccountPlatform, string>>
```

### 3. **Componente `ConnectedAccounts.tsx`**
Visualiza las cuentas conectadas del usuario.

**Props:**
- `accounts` - Objeto con cuentas conectadas
- `isOwnProfile` - Si es el perfil del usuario actual
- `onEdit` - Callback para abrir modal de edición
- `userColor` - Color personalizado del usuario

**Características:**
- Muestra iconos de cada plataforma (Lucide React)
- Colores específicos para cada plataforma
- Botón "Editar" solo visible en perfil propio
- Mensaje si no hay cuentas conectadas

**Iconos y Colores:**
- Twitch: `#9146FF` (Morado)
- Discord: `#5865F2` (Azul)
- League of Legends: `#0A8BD9` (Azul oscuro)
- Valorant: `#FA4454` (Rojo)
- Kick: `#00D084` (Verde)
- Delta Force: `#FF6B35` (Naranja)

### 4. **Componente `ConnectedAccountsModal.tsx`**
Modal para editar cuentas conectadas.

**Funcionalidades:**
- Formulario con campos para cada plataforma
- Inputs con placeholders de ejemplo
- Botón "X" para eliminar cuentas
- Validación de cambios
- Guardado en Supabase

**Flujo:**
1. Usuario abre modal
2. Completa/edita campos
3. Hace clic en "Guardar Cambios"
4. Se guardan en BD automáticamente
5. Se invalida el cache de React Query

### 5. **Integración en `PerfilHeader.tsx`**
- Importa componentes de cuentas conectadas
- Agrega estado `isAccountsModalOpen`
- Renderiza `ConnectedAccounts` en el header
- Renderiza `ConnectedAccountsModal` para edición
- Invalida cache al guardar

## Instalación y Configuración

### 1. Aplicar Migración SQL
```bash
supabase db push
```

O ejecutar manualmente en Supabase:
```sql
ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS connected_accounts JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_perfiles_connected_accounts 
ON perfiles USING GIN (connected_accounts);
```

### 2. Actualizar API de Perfil
Asegúrate de que el endpoint `/api/perfil/[publicId]` devuelva el campo `connected_accounts`:

```typescript
const { data } = await supabase
  .from('perfiles')
  .select('*, connected_accounts')
  .eq('public_id', publicId)
  .single()
```

### 3. Verificar Componentes
- ✅ `src/hooks/useConnectedAccounts.ts`
- ✅ `src/components/perfil/ConnectedAccounts.tsx`
- ✅ `src/components/perfil/ConnectedAccountsModal.tsx`
- ✅ `src/components/perfil/PerfilHeader.tsx` (actualizado)
- ✅ `src/hooks/use-perfil-usuario.ts` (actualizado)

## Uso

### Para Usuarios
1. Ir a su perfil (`/perfil`)
2. Hacer clic en "Editar" en la sección "Cuentas Conectadas"
3. Completar los campos deseados
4. Hacer clic en "Guardar Cambios"

### Para Desarrolladores
```typescript
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts'

const { accounts, addOrUpdateAccount, removeAccount } = useConnectedAccounts(userId)

// Agregar cuenta
await addOrUpdateAccount('twitch', 'usuario_twitch')

// Eliminar cuenta
await removeAccount('twitch')
```

## Estructura de Datos

### En Supabase
```sql
-- Tabla perfiles
id: uuid
username: text
connected_accounts: jsonb  -- {"twitch": "usuario", ...}
```

### En TypeScript
```typescript
interface ProfileData {
  id: string
  username: string
  connected_accounts?: Record<string, string>
  // ... otros campos
}
```

## Iconos Utilizados

Se utilizan iconos de **Lucide React**:
- `Twitch` - Twitch
- `MessageCircle` - Discord
- `Gamepad2` - League of Legends, Delta Force
- `Zap` - Valorant
- `Radio` - Kick

## Próximas Mejoras

- [ ] Validación de usernames por plataforma
- [ ] Verificación de cuentas (OAuth)
- [ ] Mostrar badges de verificación
- [ ] Estadísticas de cuentas conectadas
- [ ] Integración con APIs de plataformas
- [ ] Sincronización automática de datos

## Troubleshooting

### Las cuentas no se guardan
- Verificar que la migración SQL se aplicó correctamente
- Revisar que el usuario está autenticado
- Comprobar permisos RLS en Supabase

### Los iconos no aparecen
- Verificar que Lucide React está instalado
- Comprobar imports en `ConnectedAccounts.tsx`

### El modal no abre
- Verificar que `isAccountsModalOpen` está en estado
- Comprobar que `onEdit` callback se ejecuta

## Archivos Modificados

- `src/hooks/use-perfil-usuario.ts` - Agregado `connected_accounts` a `ProfileData`
- `src/components/perfil/PerfilHeader.tsx` - Integración de componentes

## Archivos Creados

- `supabase/migrations/20250112_add_connected_accounts.sql`
- `src/hooks/useConnectedAccounts.ts`
- `src/components/perfil/ConnectedAccounts.tsx`
- `src/components/perfil/ConnectedAccountsModal.tsx`
- `CONNECTED_ACCOUNTS_README.md` (este archivo)
