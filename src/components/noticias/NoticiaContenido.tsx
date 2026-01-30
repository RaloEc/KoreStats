"use client";

import React from "react";

interface NoticiaContenidoProps {
  contenido: string;
}

const NoticiaContenido: React.FC<NoticiaContenidoProps> = ({ contenido }) => {
  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-4xl mx-auto [&_img]:w-full md:[&_img]:max-w-[85%] [&_img]:mx-auto mb-8 noticia-contenido [.amoled_&]:[&_*]:!text-white"
      dangerouslySetInnerHTML={{
        __html: contenido,
      }}
    />
  );
};

// Memoizar el componente para evitar re-renderizados innecesarios
export default React.memo(NoticiaContenido);
