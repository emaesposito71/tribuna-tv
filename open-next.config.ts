/**
 * OpenNext — adattatore per eseguire l'app Next.js su Cloudflare Workers.
 * https://opennext.js.org/cloudflare
 *
 * Non usiamo cache ISR su R2 (il sito è tutto client-side + API routes),
 * quindi la configurazione di base è sufficiente.
 */
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
