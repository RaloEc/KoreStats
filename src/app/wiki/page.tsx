import WikiSearchableList from "@/components/wiki/WikiSearchableList";

// Datos de ejemplo para los items de Minecraft
const itemsData = [
  {
    id: "diamond",
    name: "Diamante",
    description:
      "Un mineral valioso que se encuentra en las profundidades. Se usa para crear herramientas y armaduras duraderas.",
    image: "/images/items/diamond.png",
    category: "mineral",
    properties: {
      durabilidad: "N/A",
      stackeable: "Sí (64)",
      obtencion: "Minando vetas de diamante entre Y=-63 y Y=16",
    },
  },
  {
    id: "iron_ingot",
    name: "Lingote de Hierro",
    description:
      "Material básico para la creación de herramientas, armaduras y otros objetos.",
    image: "/images/items/iron_ingot.png",
    category: "mineral",
    properties: {
      durabilidad: "N/A",
      stackeable: "Sí (64)",
      obtencion: "Fundiendo mineral de hierro",
    },
  },
  {
    id: "netherite_ingot",
    name: "Lingote de Netherita",
    description:
      "El material más resistente del juego, usado para mejorar herramientas y armaduras de diamante.",
    image: "/images/items/netherite_ingot.png",
    category: "mineral",
    properties: {
      durabilidad: "N/A",
      stackeable: "Sí (64)",
      obtencion: "Combinando 4 restos antiguos con 4 lingotes de oro",
    },
  },
  {
    id: "ender_pearl",
    name: "Perla de Ender",
    description:
      "Objeto que permite teletransportarse a corta distancia. También se usa para crear ojos de ender.",
    image: "/images/items/ender_pearl.png",
    category: "misceláneo",
    properties: {
      durabilidad: "N/A",
      stackeable: "Sí (16)",
      obtencion: "Derrotando endermans",
    },
  },
  {
    id: "golden_apple",
    name: "Manzana Dorada",
    description: "Alimento que otorga regeneración y absorción al consumirlo.",
    image: "/images/items/golden_apple.png",
    category: "alimento",
    properties: {
      durabilidad: "N/A",
      stackeable: "Sí (64)",
      obtencion: "Crafteo con 8 lingotes de oro y 1 manzana",
    },
  },
  {
    id: "elytra",
    name: "Élitros",
    description:
      "Alas que permiten planear y volar cuando se usan con cohetes de fuegos artificiales.",
    image: "/images/items/elytra.png",
    category: "equipamiento",
    properties: {
      durabilidad: "432",
      stackeable: "No",
      obtencion: "En barcos del End",
    },
  },
];

export default function WikiPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Wiki de Minecraft
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explora información detallada sobre los items del juego
            </p>
          </div>

          {/* Componente Cliente para Búsqueda y Grid */}
          <WikiSearchableList initialItems={itemsData} />
        </div>
      </main>
    </div>
  );
}
