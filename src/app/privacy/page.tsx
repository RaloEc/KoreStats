import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
              Política de Privacidad
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
                1. Introducción
              </h2>
              <p className="text-slate-300 leading-relaxed">
                KoreStats ("nosotros", "nuestro" o "la Plataforma") se
                compromete a proteger tu privacidad. Esta Política de Privacidad
                explica cómo recopilamos, utilizamos, divulgamos y
                salvaguardamos tu información cuando visitas nuestro sitio web y
                utilizas nuestros servicios.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                2. Información que Recopilamos
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Recopilamos información de varias formas:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  <strong>Información de Registro:</strong> Cuando creas una
                  cuenta, recopilamos tu nombre, correo electrónico y otra
                  información de perfil.
                </li>
                <li>
                  <strong>Información de Autenticación:</strong> Utilizamos
                  Google OAuth para autenticar usuarios. Google comparte tu ID
                  de usuario, nombre y correo electrónico con nosotros.
                </li>
                <li>
                  <strong>Información de Uso:</strong> Recopilamos datos sobre
                  cómo interactúas con nuestra plataforma, incluyendo páginas
                  visitadas, tiempo de permanencia y acciones realizadas.
                </li>
                <li>
                  <strong>Información Técnica:</strong> Recopilamos información
                  sobre tu dispositivo, navegador, dirección IP y datos de
                  conexión.
                </li>
                <li>
                  <strong>Cookies:</strong> Utilizamos cookies y tecnologías
                  similares para mejorar tu experiencia.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                3. Uso de la Información
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Utilizamos la información recopilada para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>Proporcionar, mantener y mejorar nuestros servicios</li>
                <li>Procesar transacciones y enviar información relacionada</li>
                <li>
                  Enviar comunicaciones de marketing y actualizaciones (con tu
                  consentimiento)
                </li>
                <li>Responder a tus consultas y solicitudes de soporte</li>
                <li>
                  Analizar tendencias de uso para optimizar la experiencia del
                  usuario
                </li>
                <li>Cumplir con obligaciones legales y regulatorias</li>
                <li>Prevenir fraude y actividades maliciosas</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                4. Autenticación con Google OAuth
              </h2>
              <p className="text-slate-300 leading-relaxed">
                KoreStats utiliza Google OAuth para facilitar el inicio de
                sesión seguro. Cuando te autentiques con Google:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  Google comparte tu ID de usuario, nombre y correo electrónico
                  con nosotros
                </li>
                <li>No almacenamos tu contraseña de Google</li>
                <li>
                  Puedes revocar el acceso en cualquier momento desde tu cuenta
                  de Google
                </li>
                <li>Cumplimos con la Política de Privacidad de Google</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                5. Compartir Información
              </h2>
              <p className="text-slate-300 leading-relaxed">
                No vendemos, alquilamos ni compartimos tu información personal
                con terceros, excepto:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>
                  Con proveedores de servicios que nos ayudan a operar la
                  plataforma
                </li>
                <li>
                  Cuando sea requerido por ley o para proteger nuestros derechos
                </li>
                <li>Con tu consentimiento explícito</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                6. Seguridad de Datos
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Implementamos medidas de seguridad técnicas, administrativas y
                físicas para proteger tu información personal contra acceso no
                autorizado, alteración, divulgación o destrucción. Sin embargo,
                ningún método de transmisión por Internet es 100% seguro.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                7. Retención de Datos
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Retenemos tu información personal durante el tiempo que sea
                necesario para proporcionar nuestros servicios y cumplir con
                nuestras obligaciones legales. Puedes solicitar la eliminación
                de tu cuenta en cualquier momento.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                8. Tus Derechos
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Tienes derecho a:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                <li>Acceder a tu información personal</li>
                <li>Corregir información inexacta</li>
                <li>Solicitar la eliminación de tu información</li>
                <li>Optar por no recibir comunicaciones de marketing</li>
                <li>Exportar tus datos</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                9. Cambios en esta Política
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Podemos actualizar esta Política de Privacidad de vez en cuando.
                Te notificaremos sobre cambios significativos publicando la
                nueva política en esta página y actualizando la fecha de "Última
                actualización".
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                10. Contacto
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Si tienes preguntas sobre esta Política de Privacidad o nuestras
                prácticas de privacidad, por favor contáctanos a través de
                nuestro formulario de contacto en la plataforma.
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
