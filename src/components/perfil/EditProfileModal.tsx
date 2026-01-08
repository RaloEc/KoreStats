"use client";

import { useMemo, memo, Suspense, lazy } from "react";
import { useCheckUsername } from "@/hooks/use-check-username";
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  Skeleton,
} from "@nextui-org/react";
import { X, Check, AlertCircle, Loader } from "lucide-react";

// Lazy loading de componentes pesados - solo se cargan cuando el modal está abierto
const ImageUploader = lazy(() => import("@/components/ImageUploader"));
const BannerUploader = lazy(() =>
  import("@/components/perfil/BannerUploader").then((mod) => ({
    default: mod.BannerUploader,
  }))
);

// Tipos
export interface EditProfileData {
  username: string;
  bio: string;
  color: string;
  avatar_url: string;
  banner_url: string | null;
  connected_accounts: Record<string, string>;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData: EditProfileData;
  setEditData: React.Dispatch<React.SetStateAction<EditProfileData>>;
  perfilId: string;
  currentUsername: string;
  userId?: string;
  error: string | null;
  isSaving: boolean;
  onSave: () => Promise<void>;
  isMobile?: boolean;
}

// Colores disponibles
const PROFILE_COLORS = [
  { hex: "#4F46E5", name: "Azul" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#EF4444", name: "Rojo" },
  { hex: "#F59E0B", name: "Amarillo" },
  { hex: "#8B5CF6", name: "Violeta" },
  { hex: "#06B6D4", name: "Turquesa" },
  { hex: "#F97316", name: "Naranja" },
  { hex: "#EC4899", name: "Rosa" },
];

const getColorName = (hex: string): string => {
  const color = PROFILE_COLORS.find((c) => c.hex === hex);
  return color?.name || "Personalizado";
};

// Skeleton para ImageUploader
const ImageUploaderSkeleton = memo(() => (
  <div className="space-y-4">
    <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
));
ImageUploaderSkeleton.displayName = "ImageUploaderSkeleton";

// Skeleton para BannerUploader
const BannerUploaderSkeleton = memo(() => (
  <div className="space-y-2">
    <Skeleton className="h-24 w-full rounded-xl" />
    <Skeleton className="h-10 w-32 rounded-lg" />
  </div>
));
BannerUploaderSkeleton.displayName = "BannerUploaderSkeleton";

// Componente de paleta de colores memoizado
const ColorPalette = memo(
  ({
    selectedColor,
    onSelectColor,
  }: {
    selectedColor: string;
    onSelectColor: (color: string) => void;
  }) => (
    <div className="p-2 bg-white/30 dark:bg-gray-800/40 rounded-xl border border-gray-200/50 dark:border-gray-700/60">
      <div className="grid grid-cols-4 gap-2">
        {PROFILE_COLORS.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            onClick={() => onSelectColor(hex)}
            className={`relative w-full aspect-square rounded-lg flex items-center justify-center
              ${
                selectedColor === hex
                  ? "ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-800 scale-105 shadow-sm"
                  : "hover:shadow-sm hover:scale-105"
              }
            `}
            style={{ backgroundColor: hex }}
            title={name}
            aria-label={`Seleccionar color ${name}`}
          >
            {selectedColor === hex && (
              <svg
                className="w-4 h-4 text-white drop-shadow-md"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
);
ColorPalette.displayName = "ColorPalette";

// Componente de preview de color memoizado
const ColorPreview = memo(({ color }: { color: string }) => (
  <div className="flex items-center gap-4 p-3 bg-white/50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700/70">
    <div
      className="w-10 h-10 rounded-lg shadow-sm"
      style={{ backgroundColor: color }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
        {getColorName(color)}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
        {color.toUpperCase()}
      </p>
    </div>
  </div>
));
ColorPreview.displayName = "ColorPreview";

// Componente de validación de username memoizado
const UsernameValidation = memo(
  ({
    loading,
    available,
    message,
    error,
  }: {
    loading: boolean;
    available: boolean | null;
    message?: string;
    error?: string;
  }) => {
    if (loading) {
      return (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Verificando disponibilidad...
        </p>
      );
    }
    if (available === true) {
      return (
        <p className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm">
          <Check className="w-4 h-4" />
          {message || "Username disponible"}
        </p>
      );
    }
    if (available === false) {
      return (
        <p className="text-red-600 dark:text-red-400 flex items-center gap-1 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error || "Username no disponible"}
        </p>
      );
    }
    return null;
  }
);
UsernameValidation.displayName = "UsernameValidation";

export function EditProfileModal({
  isOpen,
  onClose,
  editData,
  setEditData,
  perfilId,
  currentUsername,
  userId,
  error,
  isSaving,
  onSave,
  isMobile = false,
}: EditProfileModalProps) {
  // Validación de username
  const usernameCheck = useCheckUsername(editData.username, userId);

  const normalizedCurrentUsername = useMemo(
    () => currentUsername.trim(),
    [currentUsername]
  );
  const normalizedEditUsername = useMemo(
    () => editData.username.trim(),
    [editData.username]
  );
  const usernameChanged = normalizedEditUsername !== normalizedCurrentUsername;
  const hasUsernameValue = normalizedEditUsername.length > 0;
  const shouldShowAvailability = usernameChanged && hasUsernameValue;

  // Handler memoizado para cambio de color
  const handleColorChange = useMemo(
    () => (hex: string) => {
      setEditData((prev) => ({ ...prev, color: hex }));
    },
    [setEditData]
  );

  // Handler memoizado para cambio de username
  const handleUsernameChange = useMemo(
    () => (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditData((prev) => ({ ...prev, username: e.target.value }));
    },
    [setEditData]
  );

  // Handler memoizado para cambio de bio
  const handleBioChange = useMemo(
    () => (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditData((prev) => ({ ...prev, bio: e.target.value }));
    },
    [setEditData]
  );

  // Handler memoizado para imagen
  const handleImageUpload = useMemo(
    () => (url: string) => {
      setEditData((prev) => ({ ...prev, avatar_url: url }));
    },
    [setEditData]
  );

  // Handler memoizado para banner
  const handleBannerUpload = useMemo(
    () => (url: string) => {
      setEditData((prev) => ({ ...prev, banner_url: url }));
    },
    [setEditData]
  );

  // Estilos optimizados - sin backdrop-blur que causa lag
  const modalClassNames = useMemo(
    () => ({
      base: "bg-white dark:bg-black amoled:bg-black",
      header:
        "border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800",
      body: isMobile
        ? "bg-white dark:bg-black amoled:bg-black py-6"
        : "bg-white dark:bg-black amoled:bg-black",
      footer:
        "bg-white dark:bg-black amoled:bg-black border-t border-gray-200 dark:border-gray-800 amoled:border-gray-800",
      // Backdrop simplificado sin blur para mejor rendimiento
      backdrop: "bg-black/50",
    }),
    [isMobile]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isMobile ? "full" : "2xl"}
      scrollBehavior="inside"
      placement={isMobile ? "top" : undefined}
      className={isMobile ? "m-0 rounded-none h-full" : "max-h-[90vh] z-50"}
      hideCloseButton={isMobile}
      // Backdrop sin blur para mejor rendimiento
      backdrop={isMobile ? "transparent" : "opaque"}
      classNames={{
        ...modalClassNames,
        wrapper: isMobile ? "!items-start" : "",
        base: isMobile
          ? "bg-white dark:bg-black amoled:bg-black m-0 sm:m-0 max-h-full h-full rounded-none"
          : modalClassNames.base,
      }}
      // Animación optimizada - en móvil slide desde abajo
      motionProps={{
        variants: isMobile
          ? {
              enter: {
                y: 0,
                opacity: 1,
                transition: { duration: 0.2, ease: "easeOut" },
              },
              exit: {
                y: "100%",
                opacity: 1,
                transition: { duration: 0.15, ease: "easeIn" },
              },
            }
          : {
              enter: {
                opacity: 1,
                scale: 1,
                transition: { duration: 0.15, ease: "easeOut" },
              },
              exit: {
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.1, ease: "easeIn" },
              },
            },
        initial: isMobile
          ? { y: "100%", opacity: 1 }
          : { opacity: 0, scale: 0.95 },
      }}
    >
      <ModalContent className={isMobile ? "h-full flex flex-col" : ""}>
        <ModalHeader
          className={`bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 flex justify-between items-center shrink-0 ${
            isMobile ? "sticky top-0 z-10 py-3 px-4" : "sticky top-0 z-10"
          }`}
        >
          <h2
            className={`font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100 ${
              isMobile ? "text-lg" : "text-xl"
            }`}
          >
            Editar Perfil
          </h2>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </Button>
        </ModalHeader>

        <ModalBody
          className={`bg-white dark:bg-black amoled:bg-black ${
            isMobile
              ? "flex-1 overflow-y-auto px-4 py-4"
              : "overflow-y-auto max-h-[60vh]"
          }`}
          // Optimizaciones de scroll
          style={{
            willChange: "scroll-position",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Sección de imagen de perfil - Lazy loaded */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
              Imagen de perfil
            </h3>
            <Suspense fallback={<ImageUploaderSkeleton />}>
              <ImageUploader
                currentImageUrl={editData.avatar_url}
                userId={perfilId}
                onImageUploaded={handleImageUpload}
                className="mb-2"
              />
            </Suspense>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sube una imagen de perfil (máx. 2MB)
            </p>
          </div>

          {/* Sección de banner de perfil - Lazy loaded */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
              Banner de perfil
            </h3>
            <Suspense fallback={<BannerUploaderSkeleton />}>
              <BannerUploader
                variant="compact"
                userId={perfilId}
                currentBanner={editData.banner_url || ""}
                onUpload={handleBannerUpload}
              />
            </Suspense>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sube una imagen de banner (máx. 5MB). Relación recomendada 4:1
            </p>
          </div>

          <Divider className="my-4" />

          {/* Username con validación */}
          <div className="space-y-2">
            <Input
              label="Nombre de usuario"
              value={editData.username}
              onChange={handleUsernameChange}
              placeholder="Tu nombre de usuario"
              isInvalid={
                shouldShowAvailability && usernameCheck.available === false
              }
              color={
                shouldShowAvailability
                  ? usernameCheck.available === true
                    ? "success"
                    : usernameCheck.available === false
                    ? "danger"
                    : "default"
                  : "default"
              }
              endContent={
                shouldShowAvailability && (
                  <div className="flex items-center gap-2">
                    {usernameCheck.loading && (
                      <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {!usernameCheck.loading &&
                      usernameCheck.available === true && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    {!usernameCheck.loading &&
                      usernameCheck.available === false && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                  </div>
                )
              }
            />
            {shouldShowAvailability && (
              <UsernameValidation
                loading={usernameCheck.loading}
                available={usernameCheck.available}
                message={usernameCheck.message}
                error={usernameCheck.error}
              />
            )}
          </div>

          {/* Biografía */}
          <Textarea
            label="Biografía"
            value={editData.bio}
            onChange={handleBioChange}
            placeholder="Cuéntanos sobre ti..."
            maxRows={4}
          />

          {/* Selector de color - Componentes memoizados */}
          <div className="space-y-4">
            <ColorPreview color={editData.color} />
            <ColorPalette
              selectedColor={editData.color}
              onSelectColor={handleColorChange}
            />
          </div>
        </ModalBody>

        <ModalFooter
          className={`shrink-0 ${isMobile ? "px-4 py-3 gap-2" : ""}`}
        >
          <Button
            color="danger"
            variant="light"
            onPress={onClose}
            disabled={isSaving}
            className={isMobile ? "flex-1" : ""}
          >
            Cancelar
          </Button>
          <Button
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={
              isSaving || (usernameChanged && usernameCheck.available !== true)
            }
            className={`${
              isMobile ? "flex-1" : ""
            } bg-blue-600 hover:bg-blue-700 text-white font-medium dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Guardar Cambios
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
