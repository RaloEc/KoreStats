import React from "react";
import { Metadata } from "next";
import ClanesDirectoryClient from "@/components/clanes/ClanesDirectoryClient";

export const metadata: Metadata = {
  title: "Directorio de Clanes | KoreStats",
  description:
    "Encuentra y únete a clanes de League of Legends y Delta Force en KoreStats. Filtra por juego, política de ingreso y búsqueda por nombre.",
};

export default function ClanesPage() {
  return <ClanesDirectoryClient />;
}
