"use client";

export default function NoticiaScrollbarStyles() {
  return (
    <style jsx global>{`
      .comentarios-container::-webkit-scrollbar {
        width: 8px;
      }

      .comentarios-container::-webkit-scrollbar-track {
        background: hsl(var(--muted));
        border-radius: 4px;
      }

      .comentarios-container::-webkit-scrollbar-thumb {
        background-color: hsl(var(--primary) / 0.3);
        border-radius: 4px;
      }

      .comentarios-container::-webkit-scrollbar-thumb:hover {
        background-color: hsl(var(--primary) / 0.5);
      }
    `}</style>
  );
}
