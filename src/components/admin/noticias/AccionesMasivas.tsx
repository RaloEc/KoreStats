import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CheckSquare, Trash2, Eye, EyeOff, Star, StarOff } from 'lucide-react'
import { useAccionesMasivas } from '@/components/noticias/hooks/useAdminNoticias'
import { useToast } from '@/hooks/use-toast'

interface AccionesMasivasProps {
  seleccionadas: string[]
  onLimpiarSeleccion: () => void
}

export function AccionesMasivas({ seleccionadas, onLimpiarSeleccion }: AccionesMasivasProps) {
  const [accionPendiente, setAccionPendiente] = React.useState<{
    tipo: string
    titulo: string
    descripcion: string
  } | null>(null)

  const { mutate: ejecutarAccion, isPending } = useAccionesMasivas()
  const { toast } = useToast()

  const confirmarAccion = (tipo: string, titulo: string, descripcion: string) => {
    setAccionPendiente({ tipo, titulo, descripcion })
  }

  const ejecutarAccionMasiva = () => {
    if (!accionPendiente) return

    ejecutarAccion(
      { ids: seleccionadas, accion: accionPendiente.tipo as any },
      {
        onSuccess: () => {
          toast({
            title: 'Acción completada',
            description: `Se procesaron ${seleccionadas.length} noticias correctamente`,
          })
          onLimpiarSeleccion()
          setAccionPendiente(null)
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Error al ejecutar la acción',
            variant: 'destructive',
          })
          setAccionPendiente(null)
        },
      }
    )
  }

  if (seleccionadas.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg">
        <CheckSquare className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium">
          {seleccionadas.length} {seleccionadas.length === 1 ? 'noticia seleccionada' : 'noticias seleccionadas'}
        </span>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              Acciones
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones masivas</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() =>
                confirmarAccion(
                  'activar',
                  'Activar noticias',
                  `¿Estás seguro de que quieres activar ${seleccionadas.length} ${seleccionadas.length === 1 ? 'noticia' : 'noticias'}?`
                )
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              Activar
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() =>
                confirmarAccion(
                  'desactivar',
                  'Desactivar noticias',
                  `¿Estás seguro de que quieres desactivar ${seleccionadas.length} ${seleccionadas.length === 1 ? 'noticia' : 'noticias'}?`
                )
              }
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Desactivar
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() =>
                confirmarAccion(
                  'destacar',
                  'Destacar noticias',
                  `¿Estás seguro de que quieres destacar ${seleccionadas.length} ${seleccionadas.length === 1 ? 'noticia' : 'noticias'}?`
                )
              }
            >
              <Star className="mr-2 h-4 w-4" />
              Destacar
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() =>
                confirmarAccion(
                  'quitar_destacada',
                  'Quitar destacado',
                  `¿Estás seguro de que quieres quitar el destacado de ${seleccionadas.length} ${seleccionadas.length === 1 ? 'noticia' : 'noticias'}?`
                )
              }
            >
              <StarOff className="mr-2 h-4 w-4" />
              Quitar destacado
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() =>
                confirmarAccion(
                  'eliminar',
                  'Eliminar noticias',
                  `¿Estás seguro de que quieres eliminar permanentemente ${seleccionadas.length} ${seleccionadas.length === 1 ? 'noticia' : 'noticias'}? Esta acción no se puede deshacer.`
                )
              }
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onLimpiarSeleccion}>
          Cancelar
        </Button>
      </div>

      <AlertDialog open={!!accionPendiente} onOpenChange={() => setAccionPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{accionPendiente?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {accionPendiente?.descripcion}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={ejecutarAccionMasiva}
              disabled={isPending}
              className={accionPendiente?.tipo === 'eliminar' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isPending ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
