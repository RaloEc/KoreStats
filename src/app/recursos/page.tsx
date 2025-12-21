import RecursosList from "@/components/recursos/RecursosList";

// Datos de ejemplo para los recursos
const recursos = {
  mods: [
    {
      id: "create-mod",
      nombre: "Create Mod",
      descripcion:
        "Un mod que añade maquinaria y automatización con un estilo steampunk.",
      version: "0.5.1",
      compatibilidad: "1.19.2",
      autor: "simibubi",
      descargas: "15M+",
      imagen: "/images/recursos/create-mod.jpg",
    },
    {
      id: "jei",
      nombre: "Just Enough Items (JEI)",
      descripcion: "Muestra recetas y usos de todos los items del juego.",
      version: "11.5.0",
      compatibilidad: "1.19.2",
      autor: "mezz",
      descargas: "50M+",
      imagen: "/images/recursos/jei.jpg",
    },
    {
      id: "botania",
      nombre: "Botania",
      descripcion: "Mod de magia técnica basado en la naturaleza y las flores.",
      version: "1.19.2-437",
      compatibilidad: "1.19.2",
      autor: "Vazkii",
      descargas: "20M+",
      imagen: "/images/recursos/botania.jpg",
    },
  ],
  texturas: [
    {
      id: "faithful",
      nombre: "Faithful 32x",
      descripcion:
        "Una versión mejorada de las texturas vanilla con mayor resolución.",
      version: "1.19",
      compatibilidad: "1.19.x",
      autor: "Faithful Team",
      descargas: "30M+",
      imagen: "/images/recursos/faithful.jpg",
    },
    {
      id: "patrix",
      nombre: "Patrix",
      descripcion: "Pack de texturas realistas de alta resolución.",
      version: "1.19.2",
      compatibilidad: "1.19.2",
      autor: "Patrix Team",
      descargas: "5M+",
      imagen: "/images/recursos/patrix.jpg",
    },
    {
      id: "bare-bones",
      nombre: "Bare Bones",
      descripcion:
        "Texturas minimalistas inspiradas en el estilo de los trailers oficiales.",
      version: "1.19",
      compatibilidad: "1.19.x",
      autor: "RobotPants",
      descargas: "8M+",
      imagen: "/images/recursos/bare-bones.jpg",
    },
  ],
  shaders: [
    {
      id: "bsl",
      nombre: "BSL Shaders",
      descripcion:
        "Shaders con iluminación realista y efectos visuales avanzados.",
      version: "8.2.02",
      compatibilidad: "1.19.x",
      autor: "Capt Tatsu",
      descargas: "10M+",
      imagen: "/images/recursos/bsl.jpg",
    },
    {
      id: "seus",
      nombre: "SEUS (Sonic Ether's Unbelievable Shaders)",
      descripcion:
        "Uno de los packs de shaders más populares con efectos visuales impresionantes.",
      version: "11.0",
      compatibilidad: "1.19.x",
      autor: "Sonic Ether",
      descargas: "25M+",
      imagen: "/images/recursos/seus.jpg",
    },
    {
      id: "complementary",
      nombre: "Complementary Shaders",
      descripcion: "Shaders optimizados con gran calidad visual y rendimiento.",
      version: "4.6",
      compatibilidad: "1.19.x",
      autor: "EminGT",
      descargas: "15M+",
      imagen: "/images/recursos/complementary.jpg",
    },
  ],
};

export default function RecursosPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Recursos para Minecraft
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Descubre los mejores mods, packs de texturas y shaders para
              mejorar tu experiencia de juego
            </p>
          </div>

          <RecursosList recursos={recursos} />
        </div>
      </main>
    </div>
  );
}
