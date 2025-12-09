"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivityActions } from "@/hooks/use-activity-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActivityCardMenuProps {
  activityType: string;
  activityId: string;
  isOwnProfile: boolean;
  isAdmin: boolean;
  onHide?: () => void;
  onUnhide?: () => void;
  onDelete?: () => void;
  isHidden?: boolean;
}

export function ActivityCardMenu({
  activityType,
  activityId,
  isOwnProfile,
  isAdmin,
  onHide,
  onUnhide,
  onDelete,
  isHidden,
}: ActivityCardMenuProps) {
  const { hideActivity, unhideActivity, deleteActivity, isLoading } =
    useActivityActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleHide = async () => {
    const success = await hideActivity({ activityType, activityId });
    if (success && onHide) {
      onHide();
    }
  };

  const handleUnhide = async () => {
    const success = await unhideActivity({ activityType, activityId });
    if (success && onUnhide) {
      onUnhide();
    }
  };

  const handleDelete = async () => {
    const success = await deleteActivity({ activityType, activityId });
    if (success && onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  // No mostrar menú si no hay permisos
  if (!isOwnProfile && !isAdmin) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Opciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwnProfile &&
            (isHidden ? (
              <DropdownMenuItem onClick={handleUnhide} disabled={isLoading}>
                <EyeOff className="mr-2 h-4 w-4" />
                <span>Mostrar</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleHide} disabled={isLoading}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Ocultar</span>
              </DropdownMenuItem>
            ))}

          {/* Eliminar: disponible para el dueño Y para admins */}
          {(isOwnProfile || isAdmin) && (
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar{isAdmin && !isOwnProfile ? " (Admin)" : ""}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar actividad</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no
            se puede deshacer.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
