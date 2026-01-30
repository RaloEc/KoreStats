import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

type StatusType = "online" | "in-game" | "offline";

interface UseUpdateUserStatusReturn {
  updateStatus: (status: StatusType) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateUserStatus(): UseUpdateUserStatusReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const updateStatus = useCallback(
    async (status: StatusType) => {
      if (!user?.id) {
        return;
      }

      try {
        const { error } = await supabase
          .from("perfiles")
          .update({ status })
          .eq("id", user.id);

        if (error) {
          toast({
            title: "Error",
            description: "No se pudo actualizar el estado",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Error inesperado al actualizar estado",
          variant: "destructive",
        });
      }
    },
    [user?.id, supabase, toast],
  );

  return {
    updateStatus,
    isUpdating: false,
  };
}
