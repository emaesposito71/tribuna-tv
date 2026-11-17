# Tribuna TV — Guida per andare online

Questa guida ti porta da "progetto sul computer" a **sito online e funzionante** in ~15 minuti, senza scrivere codice.

**Raccomandazione: Cloudflare Workers** (piano gratuito). A fine guida spiego perché è la scelta migliore per questo sito e quando conviene invece Vercel.

---

## 1. Panoramica (3 passaggi)

1. **Scarichi il progetto** sul tuo computer (file `tribuna-tv-sorgente.zip` che ti ho preparato).
2. **Carichi il progetto su GitHub** (servirà da "ponte").
3. **Colleghi Cloudflare a GitHub**: da lì in poi Cloudflare pubblica e aggiorna il sito da solo, per sempre.

---

## 2. Scarica e prepara il progetto

1. Scarica **`tribuna-tv-sorgente.zip`** (te l'ho messo tra i file scaricabili di questa chat).
2. Estrai lo zip in una cartella, es. `C:\Users\Tuonome\tribuna-tv` (su Mac: `~/tribuna-tv`).
3. Verifica che dentro ci siano: la cartella `src`, la cartella `public`, il file `package.json`, il file `wrangler.jsonc` e `GUIDA-DEPLOYMENT.md`.

> Non aprire o spostare i file: servono tutti così come sono.

---

## 3. Crea l'account GitHub e carica il progetto

### 3.1 Crea l'account

- Vai su **github.com** → **Sign up** → segui la procedura (email + password).
- Verifica l'email come richiesto.

### 3.2 Carica il progetto — metodo consigliato (GitHub Desktop)

1. Scarica **GitHub Desktop** (desktop.github.com) e installalo.
2. Aprilo → **File → Add local repository** → seleziona la cartella `tribuna-tv`.
3. Ti dirà che la cartella non è un repository → clicca **create a repository** → lascia tutto com'è → **Create repository**.
4. Clicca **Publish repository** → lascia spuntato **Private** (consigliato) → **Publish**.

Fatto: il tuo codice ora è su GitHub (privato, solo tuo).

### 3.3 Metodo alternativo (solo browser, senza installare nulla)

1. Vai su **github.com/new**.
2. Nome repository: `tribuna-tv` → scegli **Private** → clicca **Create repository**.
3. Nella pagina successiva clicca **uploading an existing file**.
4. Apri la cartella estratta, seleziona **tutti i file e le cartelle** che contiene e trascinali nella pagina di GitHub.
5. Attendi che carichi tutto → clicca **Commit changes**.

> Con questo metodo il caricamento è più lento (ci possono volere alcuni minuti): è normale.

---

## 4. Crea l'account Cloudflare e pubblica il sito

### 4.1 Crea l'account

- Vai su **dash.cloudflare.com** → **Sign up** (piano **Free**, non serve la carta di credito).

### 4.2 Collega il repository

1. Nel menu a sinistra: **Workers & Pages** → **Create** → **Workers** → **Import a repository**.
2. La prima volta ti chiede di collegare GitHub: clicca **Connect GitHub** → autorizza l'accesso (puoi concederlo solo al repository `tribuna-tv`).
3. Seleziona il repository **tribuna-tv** → **Begin setup**.

### 4.3 Controlla le impostazioni di build

Se non sono già precompilate, usa esattamente queste:

| Campo | Valore |
| --- | --- |
| Project name | `tribuna-tv` |
| Install command | `npm ci` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |

Clicca **Deploy**. Dopo 2-4 minuti di build il sito è online all'indirizzo:

```
https://tribuna-tv.<tuosottodominio>.workers.dev
```

(L'indirizzo esatto te lo mostra la dashboard; puoi salvarlo nei preferiti.)

### 4.4 Da smartphone: aggiungilo alla schermata Home

1. Apri l'indirizzo del sito con **Safari** (iPhone/iPad).
2. Tocca l'icona **Condividi** → **Aggiungi a Home**.
3. Ora Tribuna TV si apre a tutto schermo come una vera app, con la tua icona.

---

## 5. Prova che tutto funzioni

| Prova | Come |
| --- | --- |
| Canali 24/7 | Apri la sezione **Canali 24/7** → tocca un canale → il player parte in pochi secondi |
| Eventi | Apri **Eventi** → tocca un evento in diretta → il player parte |
| Ricerca | Scrivi "sky" nella barra di ricerca → filtra i risultati |
| iPhone in orizzontale | Gira il telefono durante la riproduzione → video a schermo intero |

**Nota importante sui flussi:** se un singolo canale o evento non parte ma gli altri sì, il problema è il *flusso di origine* (i link IPTV cambiano spesso o vanno offline), non il sito. Riprova più tardi o prova un altro canale. Se **nessuno** parte, riapri il sito tra qualche minuto (le playlist si ricaricano da sole ogni 5 minuti).

---

## 6. Come aggiornare il sito in futuro

- **Cambiare le playlist**: apri il file `src/config/tribuna.ts`, sostituisci gli URL, salva. Poi su GitHub Desktop: scrivi un messaggio (es. "nuove playlist") → **Commit** → **Push origin**. Cloudflare ricostruisce e pubblica da solo in ~3 minuti.
- **Qualsiasi altra modifica al codice**: stesso meccanismo — Commit + Push e il sito si aggiorna.

---

## 7. Perché Cloudflare (e quando invece Vercel)

Prima una precisazione utile: **non è Vercel che "blocca i flussi HTTP"**. È il *browser* che, su qualsiasi sito HTTPS (quindi sia su Vercel che su Cloudflare), blocca i contenuti `http://` caricati da una pagina `https://` (regola chiamata *mixed content*). I tuoi canali 24/7 usano flussi `http://`, quindi **su qualsiasi hosting sarebbero bloccati** senza un accorgimento.

L'accorgimento c'è già: il sito fa passare tutti i video e le immagini dal suo **proxy interno** (`/api/stream`), che scarica il flusso dal server e lo ridistribuisce via HTTPS. Funziona identico su Vercel e su Cloudflare — te l'ho già testato nel runtime vero di Cloudflare.

La differenza vera tra le due piattaforme è **quanta banda gratuita** danno, perché il proxy fa transitare tutto il video per il loro server:

| | **Cloudflare Workers (Free)** | **Vercel (Hobby)** |
| --- | --- | --- |
| Banda | **Illimitata** | **100 GB/mese**, poi sito sospeso fino al mese dopo |
| Limite richieste | 100.000/giorno | — |
| Costo se cresci | Da 5 $/mese (limite molto più alto) | Da 20 $/mese |
| Facilità | Media (si segue la guida) | Facile (stesso flusso GitHub) |

- Un flusso a qualità media consuma **≈ 0,8 GB/ora** per spettatore (a qualità massima ≈ 2 GB/ora).
- Su Vercel i 100 GB finiscono dopo **~50-120 ore di visione totali al mese** (pochi amici che seguono il calcio possono bastare). Dopo: sito giù fino al 1° del mese.
- Su Cloudflare il limite è di **richieste**, non di banda: ogni pezzettino di video è 1 richiesta (≈ 700-900 per ora di visione). Con 100.000/giorno puoi sostenere **centinaia di ore di visione al giorno**: per un sito personale resta margine enorme.

**Conclusione: Cloudflare.** Vercel va benissimo solo per fare un test veloce di qualche giorno.

---

## 8. Problemi comuni

| Problema | Soluzione |
| --- | --- |
| La build su Cloudflare fallisce con errore Node.js | Nella dashboard del Worker: **Settings → Build → Variables and secrets**, aggiungi `NODE_VERSION` = `22` e rideploy |
| "npm ci" fallisce | Nel campo Install command usa `npm install` |
| Player che non parte, solo su un canale | È il flusso di origine, non il sito: prova un altro canale o più tardi |
| Player che non parte su nessun canale | Apri `/api/playlist?type=channels` nel browser: se vedi i dati JSON il sito è ok — attendi 5 minuti (cache) e riprova |
| Video bloccato dopo poco su iPhone | Chiudi e riapri la pagina: i link dei flussi live a volte scadono |
| Vuoi vedere se il sito sta superando i limiti | Dashboard Cloudflare → il tuo Worker → **Metrics / Observability** |

---

## 9. Alternative (per curiosità)

- **Vercel**: identico flusso GitHub (vercel.com → Add New Project → Import), zero configurazione. Comodo, ma attenzione ai 100 GB/mese (vedi tabella sopra).
- **Server tuo (es. VPS o Raspberry)**: `npm run build:standalone` poi `npm start` (porta 3000). Massima libertà, ma devi gestire tu HTTPS, dominio e riavvii.
- **Cloudflare a pagamento (Workers Paid, 5 $/mese)**: solo se un giorno superi le 100.000 richieste/giorno con tanti utenti.

---

*Tribuna TV — configurazione già pronta e testata per Cloudflare Workers (adattatore OpenNext, file `wrangler.jsonc` e `open-next.config.ts` inclusi).*
