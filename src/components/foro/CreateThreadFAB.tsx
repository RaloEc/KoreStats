"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "@/components/layout/mobile-navbar.css";

export default function CreateThreadFAB() {
  const router = useRouter();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[40] flex lg:hidden pwa-hidden flex-col items-end">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/foro/crear-hilo")}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              className="relative group flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              aria-label="Crear nuevo hilo"
            >
              <motion.div
                animate={{ rotate: isHovered ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="w-8 h-8" strokeWidth={2.5} />
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            <p className="font-semibold">Crear Hilo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
