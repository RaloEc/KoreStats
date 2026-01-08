# Instrucciones Finales - Integración Admin Usuarios

## 🔧 Pasos Críticos para Completar

### 1. Actualizar Tipos TypeScript

**Archivo:** `src/types/index.ts`

Buscar la interfaz `Perfil` y agregar los nuevos campos:

```typescript
export interface Perfil {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  created_at: string
  updated_at: string | null
  color: string | null
  activo: boolean | null
  ubicacion: string | null
  sitio_web: string | null
  fecha_ultimo_acceso: string | null
  banner_url: string | null
  // NUEVOS CAMPOS - AGREGAR ESTOS:
  email_verificado?: boolean
  racha_dias?: number
  badges?: any[]
  notas_moderador?: string
  ip_registro?: string
}
```

### 2. Aplicar Migración de Base de Datos

**Opción A - Usando Supabase CLI:**
```cmd
cd r:\Proyectos\BitArena\Mc-Community
supabase db push
```

**Opción B - Dashboard de Supabase:**
1. Ir a SQL Editor en Supabase Dashboard
2. Copiar contenido de `supabase/migrations/20251012000100_admin_usuarios_mejoras.sql`
3. Ejecutar el script
4. Verificar que no haya errores

### 3. Verificar React Query

Asegurarse de que React Query esté configurado en la aplicación.

**Archivo:** `src/app/layout.tsx` o `src/components/Providers.tsx`

Debe incluir:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
})

// En el return:
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

### 4. Reemplazar Página Principal

El archivo `src/app/admin/usuarios/page.tsx` tiene errores de sintaxis por ediciones parciales.

**Solución:** Eliminar el archivo actual y crear uno nuevo con este contenido mínimo funcional:

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminProtection from '@/components/AdminProtection'
import { UsuarioCompleto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, UserPlus, RefreshCw, Download, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { useAdminUsuarios, useToggleUsuarioStatus, useEliminarUsuario, useAccionesLote, type FiltrosUsuarios } from '@/components/admin/usuarios/hooks/useAdminUsuarios'
import { DialogoSuspension } from '@/components/admin/usuarios/DialogoSuspension'
import { DialogoAdvertencia } from '@/components/admin/usuarios/DialogoAdvertencia'
import { FiltrosAvanzados } from '@/components/admin/usuarios/FiltrosAvanzados'
import { BarraAccionesLote } from '@/components/admin/usuarios/BarraAccionesLote'
import { TablaUsuarios } from '@/components/admin/usuarios/TablaUsuarios'

function AdminUsuariosContent() {
  const router = useRouter()
  
  // Estados
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [inactivoDias, setInactivoDias] = useState('')
  const [emailVerificado, setEmailVerificado] = useState('')
  const [ordenCampo, setOrdenCampo] = useState('created_at')
  const [ordenDireccion, setOrdenDireccion] = useState<'ASC' | 'DESC'>('DESC')
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(10)
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([])
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; usuario: UsuarioCompleto | null }>({ open: false, usuario: null })
  const [suspenderDialog, setSuspenderDialog] = useState<{ open: boolean; usuario: UsuarioCompleto | null }>({ open: false, usuario: null })
  const [advertirDialog, setAdvertirDialog] = useState<{ open: boolean; usuario: UsuarioCompleto | null }>({ open: false, usuario: null })

  const debouncedSearch = useDebounce(searchTerm, 500)

  const filtros: FiltrosUsuarios = useMemo(() => ({
    search: debouncedSearch,
    role: roleFilter && roleFilter !== 'all' ? roleFilter : undefined,
    activo: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    inactivoDias: inactivoDias ? parseInt(inactivoDias) : undefined,
    emailVerificado: emailVerificado && emailVerificado !== 'all' ? emailVerificado === 'true' : undefined,
    ordenCampo,
    ordenDireccion
  }), [debouncedSearch, roleFilter, statusFilter, fechaDesde, fechaHasta, inactivoDias, emailVerificado, ordenCampo, ordenDireccion])

  const { data, isLoading, refetch } = useAdminUsuarios(filtros, currentPage, itemsPorPagina)
  const toggleStatus = useToggleUsuarioStatus()
  const eliminarUsuario = useEliminarUsuario()
  const accionesLote = useAccionesLote()

  const usuarios = data?.usuarios || []
  const totalPages = data?.totalPages || 1

  // Funciones
  const cambiarOrden = useCallback((campo: string) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(prev => prev === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setOrdenCampo(campo)
      setOrdenDireccion('DESC')
    }
  }, [ordenCampo])

  const toggleSeleccionUsuario = useCallback((usuarioId: string) => {
    setUsuariosSeleccionados(prev => 
      prev.includes(usuarioId) ? prev.filter(id => id !== usuarioId) : [...prev, usuarioId]
    )
  }, [])

  const toggleSeleccionTodos = useCallback(() => {
    setUsuariosSeleccionados(prev => prev.length === usuarios.length ? [] : usuarios.map(u => u.id))
  }, [usuarios])

  const limpiarFiltros = useCallback(() => {
    setSearchTerm('')
    setRoleFilter('')
    setStatusFilter('')
    setFechaDesde('')
    setFechaHasta('')
    setInactivoDias('')
    setEmailVerificado('')
    setOrdenCampo('created_at')
    setOrdenDireccion('DESC')
    setCurrentPage(1)
  }, [])

  const exportarCSV = useCallback(() => {
    if (!usuarios.length) {
      toast.error('No hay usuarios para exportar')
      return
    }
    const headers = ['ID', 'Username', 'Email', 'Rol', 'Estado', 'Fecha Registro', 'Último Acceso']
    const rows = usuarios.map(u => [
      u.id,
      u.perfil?.username || '',
      u.email || '',
      u.perfil?.role || '',
      u.perfil?.activo ? 'Activo' : 'Inactivo',
      new Date(u.created_at).toLocaleDateString(),
      u.perfil?.fecha_ultimo_acceso ? new Date(u.perfil.fecha_ultimo_acceso).toLocaleDateString() : 'Nunca'
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Usuarios exportados correctamente')
  }, [usuarios])

  const ejecutarAccionLote = useCallback(async (accion: 'activar' | 'desactivar' | 'eliminar') => {
    if (usuariosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un usuario')
      return
    }
    const confirmacion = window.confirm(`¿Estás seguro de ${accion} ${usuariosSeleccionados.length} usuario(s)?`)
    if (!confirmacion) return
    await accionesLote.mutateAsync({ usuarioIds: usuariosSeleccionados, accion })
    setUsuariosSeleccionados([])
  }, [usuariosSeleccionados, accionesLote])

  const handleToggleStatus = useCallback(async (usuario: UsuarioCompleto) => {
    await toggleStatus.mutateAsync({ usuarioId: usuario.id, activo: !(usuario.perfil?.activo ?? false) })
  }, [toggleStatus])

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.usuario) return
    await eliminarUsuario.mutateAsync(deleteDialog.usuario.id)
    setDeleteDialog({ open: false, usuario: null })
  }, [deleteDialog, eliminarUsuario])

  return (
    <div className="p-4 md:p-6 bg-background/80 rounded-lg min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">Administra, edita y visualiza los usuarios de la comunidad.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => router.push('/admin/usuarios/crear')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Añadir Usuario
          </Button>
        </div>
      </header>

      <BarraAccionesLote
        cantidadSeleccionados={usuariosSeleccionados.length}
        onActivar={() => ejecutarAccionLote('activar')}
        onDesactivar={() => ejecutarAccionLote('desactivar')}
        onEliminar={() => ejecutarAccionLote('eliminar')}
        onCancelar={() => setUsuariosSeleccionados([])}
      />

      <div className="mb-6 p-4 bg-card rounded-lg border space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="usuario">Usuario</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={limpiarFiltros}>
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {mostrarFiltrosAvanzados && (
          <FiltrosAvanzados
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            inactivoDias={inactivoDias}
            emailVerificado={emailVerificado}
            onFechaDesdeChange={setFechaDesde}
            onFechaHastaChange={setFechaHasta}
            onInactivoDiasChange={setInactivoDias}
            onEmailVerificadoChange={setEmailVerificado}
            onLimpiar={limpiarFiltros}
          />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={itemsPorPagina.toString()} onValueChange={(v) => { setItemsPorPagina(parseInt(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">por página</span>
        </div>
        <span className="text-sm text-muted-foreground">Total: {data?.total || 0} usuarios</span>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <TablaUsuarios
          usuarios={usuarios}
          isLoading={isLoading}
          usuariosSeleccionados={usuariosSeleccionados}
          ordenCampo={ordenCampo}
          ordenDireccion={ordenDireccion}
          onToggleSeleccionTodos={toggleSeleccionTodos}
          onToggleSeleccionUsuario={toggleSeleccionUsuario}
          onCambiarOrden={cambiarOrden}
          onToggleStatus={handleToggleStatus}
          onAdvertir={(usuario) => setAdvertirDialog({ open: true, usuario })}
          onSuspender={(usuario) => setSuspenderDialog({ open: true, usuario })}
          onEliminar={(usuario) => setDeleteDialog({ open: true, usuario })}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            Anterior
          </Button>
          <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
            Siguiente
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, usuario: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar al usuario <strong>{deleteDialog.usuario?.perfil?.username}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DialogoSuspension
        open={suspenderDialog.open}
        onOpenChange={(open) => setSuspenderDialog({ open, usuario: open ? suspenderDialog.usuario : null })}
        usuario={suspenderDialog.usuario}
      />

      <DialogoAdvertencia
        open={advertirDialog.open}
        onOpenChange={(open) => setAdvertirDialog({ open, usuario: open ? advertirDialog.usuario : null })}
        usuario={advertirDialog.usuario}
      />
    </div>
  )
}

export default function AdminUsuarios() {
  return (
    <AdminProtection>
      <AdminUsuariosContent />
    </AdminProtection>
  )
}
```

## ✅ Checklist Final

- [ ] Tipos actualizados en `src/types/index.ts`
- [ ] Migración aplicada en Supabase
- [ ] React Query configurado
- [ ] Archivo `page.tsx` reemplazado
- [ ] Compilación sin errores (`npm run build`)
- [ ] Probado en desarrollo (`npm run dev`)

## 🎯 Resultado

Tendrás un sistema completo de administración de usuarios con:
- Filtros avanzados
- Ordenamiento dinámico
- Acciones en lote
- Sistema de moderación
- Exportación CSV
- Logs de auditoría
- Estadísticas detalladas

¡Todo listo para producción!
