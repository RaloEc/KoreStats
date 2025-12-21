# Guía de Configuración: Cron Jobs Externos (cron-job.org)

Dado que **Netlify** no ejecuta tareas programadas de forma nativa (como lo hace Vercel con `vercel.json`), necesitamos un "despertador" externo que llame a nuestra API cada minuto para actualizar las partidas.

El servicio recomendado es **cron-job.org** (es gratuito, fiable y fácil de usar).

## Paso 1: Obtener tu CRON_SECRET

1.  Ve a tu archivo `.env.local` (o a tu panel de variables de entorno en Netlify).
2.  Busca o genera un valor para `CRON_SECRET`.
    - _Ejemplo:_ `4b892-secret-key-992a` (puede ser cualquier string segura).
3.  **IMPORTANTE:** Asegúrate de que esta misma clave esté guardada en las variables de entorno de **Netlify**.

## Paso 2: Crear cuenta en cron-job.org

1.  Ingresa a [https://cron-job.org/en/](https://cron-job.org/en/)
2.  Regístrate (Sign Up) y verifica tu correo.

## Paso 3: Crear el Cron Job

1.  En el panel de control (Dashboard), haz clic en **"Create Cronjob"**.
2.  Configura los siguientes campos:

    - **Title:** `Actualizar Partidas BitArena` (o el nombre que quieras).
    - **Address (URL):**
      `https://TU-DOMINIO.netlify.app/api/cron/check-active-matches`
      _(Reemplaza TU-DOMINIO por tu URL real de producción)._

    - **Schedule (Programación):**
      - Selecciona "Every 1 minute(s)".
        _(Esto asegurará que el sistema verifique partidas activas constantemente)._

3.  **Configuración Avanzada (Headers) - ¡CRÍTICO!**

    - Despliega la sección "Advanced".
    - Busca "Headers" (o Request Headers).
    - Añade una nueva cabecera:
      - **Key (Nombre):** `Authorization`
      - **Value (Valor):** `Bearer TU_CRON_SECRET`
        _(Reemplaza TU_CRON_SECRET por el valor real que tienes en Netlify)._

4.  **Método HTTP:**

    - Asegúrate de que esté en **GET** (por defecto).

5.  **Guardar:**
    - Haz clic en "Create Cronjob".

## Paso 4: Verificar

1.  Espera un minuto o fuerza una ejecución manual desde el panel ("Run Now" o similar).
2.  Ve a la pestaña "History" o "Last Execution".
3.  Deberías ver un estado **200 OK**.
    - Si ves un **401 Unauthorized**, revisa que el `CRON_SECRET` coincida.
    - Si ves un **500 Error**, revisa los logs de Netlify.

---

## ¿Cómo funciona esto?

1.  Cada minuto, `cron-job.org` visita la URL secreta de tu API.
2.  Tu servidor recibe la petición, verifica la clave secreta y ejecuta el script de actualización.
3.  El script revisa si hay usuarios jugando y actualiza sus partidas si han terminado.
4.  Si nadie está jugando, el script termina en milisegundos y no consume recursos extra.
