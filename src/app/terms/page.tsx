import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Términos de Servicio
            </h1>
            <p className="text-slate-400">
              Última actualización: {new Date().toLocaleDateString("es-ES")}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-6">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                1. Aceptación de Términos
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Al acceder y utilizar KoreStats, aceptas estar vinculado por
                estos Términos de Servicio. Si no aceptas estos términos, no
                debes utilizar la plataforma. Nos reservamos el derecho de
                modificar estos términos en cualquier momento, y tu uso
                continuado de la plataforma constituye la aceptación de
                cualquier cambio.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                2. Descripción del Servicio
              </h2>
              <p className="text-slate-300 leading-relaxed">
                KoreStats es una plataforma de estadísticas de videojuegos que
                proporciona análisis, información y herramientas relacionadas
                con juegos. Nuestros servicios incluyen, entre otros:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>Análisis de estadísticas de jugadores</li>
                <li>Información sobre videojuegos</li>
                <li>Foros de comunidad</li>
                <li>Noticias y actualizaciones de juegos</li>
                <li>Herramientas de análisis de armas y equipamiento</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                3. Elegibilidad del Usuario
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Para utilizar KoreStats, debes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  Tener al menos 13 años de edad (o la edad mínima requerida en
                  tu jurisdicción)
                </li>
                <li>Tener autoridad legal para aceptar estos términos</li>
                <li>No estar prohibido de utilizar nuestros servicios</li>
                <li>
                  Proporcionar información precisa y completa durante el
                  registro
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                4. Autenticación y Seguridad de Cuenta
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Utilizamos Google OAuth para la autenticación segura. Eres
                responsable de:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>Mantener la confidencialidad de tu cuenta de Google</li>
                <li>Todas las actividades que ocurran bajo tu cuenta</li>
                <li>
                  Notificarnos inmediatamente de cualquier uso no autorizado
                </li>
                <li>Cerrar sesión cuando termines de usar la plataforma</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                5. Contenido del Usuario
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Al publicar contenido en KoreStats (comentarios, posts, etc.),
                otorgas a KoreStats una licencia mundial, no exclusiva, libre de
                regalías para usar, reproducir, modificar y distribuir dicho
                contenido. Eres responsable de:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  Asegurar que tienes derechos sobre el contenido que publicas
                </li>
                <li>
                  No publicar contenido ilegal, ofensivo o que viole derechos de
                  terceros
                </li>
                <li>No publicar spam, malware o contenido malicioso</li>
                <li>Respetar los derechos de otros usuarios</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                6. Prohibiciones
              </h2>
              <p className="text-slate-300 leading-relaxed">No debes:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  Usar la plataforma para actividades ilegales o no autorizadas
                </li>
                <li>Intentar acceder a sistemas o datos sin autorización</li>
                <li>Interferir con el funcionamiento de la plataforma</li>
                <li>
                  Usar bots, scrapers o herramientas de automatización sin
                  permiso
                </li>
                <li>Acosar, intimidar o amenazar a otros usuarios</li>
                <li>
                  Publicar contenido que viole derechos de autor o propiedad
                  intelectual
                </li>
                <li>Engañar o defraudar a otros usuarios o a KoreStats</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                7. Propiedad Intelectual
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Todo el contenido de KoreStats, incluyendo texto, gráficos,
                logos, imágenes y software, es propiedad de KoreStats o de sus
                proveedores de contenido y está protegido por leyes de derechos
                de autor. No puedes reproducir, distribuir o transmitir este
                contenido sin permiso explícito.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                8. Limitación de Responsabilidad
              </h2>
              <p className="text-slate-300 leading-relaxed">
                KoreStats se proporciona "tal cual" sin garantías de ningún
                tipo. En la máxima medida permitida por la ley, KoreStats no
                será responsable por:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>Daños indirectos, incidentales o consecuentes</li>
                <li>Pérdida de datos o ganancias</li>
                <li>Interrupción del servicio</li>
                <li>Errores o inexactitudes en la información</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                9. Terminación
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Podemos suspender o terminar tu acceso a KoreStats en cualquier
                momento, con o sin causa, y sin previo aviso. Esto incluye
                violaciones de estos términos, actividades maliciosas o por
                cualquier otra razón a nuestro criterio.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                10. Ley Aplicable
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Estos Términos de Servicio se rigen por las leyes aplicables en
                la jurisdicción donde opera KoreStats. Cualquier disputa será
                resuelta en los tribunales competentes de esa jurisdicción.
              </p>
            </section>

            {/* Section 11 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                11. Cambios en el Servicio
              </h2>
              <p className="text-slate-300 leading-relaxed">
                KoreStats se reserva el derecho de modificar, suspender o
                descontinuar cualquier parte del servicio en cualquier momento.
                No seremos responsables por ninguna modificación o interrupción
                del servicio.
              </p>
            </section>

            {/* Section 12 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                12. Contacto
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Si tienes preguntas sobre estos Términos de Servicio, por favor
                contáctanos a través de nuestro formulario de contacto en la
                plataforma.
              </p>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="pt-8 border-t border-slate-800">
            <Link href="/">
              <Button
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
