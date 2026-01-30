"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferences {
  // Appearance
  mobileScoreboardView: "carousel" | "list";
  setMobileScoreboardView: (view: "carousel" | "list") => void;

  // Future settings can go here
  // ...
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      mobileScoreboardView: "carousel", // Default
      setMobileScoreboardView: (view) => set({ mobileScoreboardView: view }),
    }),
    {
      name: "user-preferences-storage", // name of the item in the storage (must be unique)
    },
  ),
);
