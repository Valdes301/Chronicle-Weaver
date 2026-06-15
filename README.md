# 📜 Tessitore di Cronache

**Tessitore di Cronache** è l'assistente definitivo per Dungeon Master di D&D 5e. Alimentato da **Google Gemini**, trasforma la gestione della tua campagna in un'esperienza fluida, creativa e organizzata, agendo come un vero e proprio co-DM intelligente.

---

## ✨ Caratteristiche Principali

### 🧠 Gestione Avanzata della Memoria (Long-Term Continuity)
*   **Biblioteca delle Cronache**: Organizza la campagna in Archi Narrativi. Genera riassunti densi che mantengono nomi di PNG e oggetti chiave.
*   **Compendio Globale**: Gli archi conclusi vengono distillati nella memoria a lungo termine per garantire coerenza narrativa infinita.
*   **Pannello di Controllo IA**: Modifica direttamente i "System Prompts" dal Compendio Homebrew per cambiare il carattere e lo stile del tuo co-DM.

### 🛠️ Arsenale Creativo IA
*   **Generatore di Storie Dinamiche**: Crea bozze di sessioni con calcolo automatico degli XP, ganci per i personaggi e revisione interattiva.
*   **Architetto di Mondi (Mappe SVG)**: Genera luoghi con descrizioni sensoriali e planimetrie vettoriali SVG esportabili in PNG.
*   **Taverna dell'Oste**: Sistema di improvvisazione istantanea per dicerie (vere o false) e dettagli del mondo in tempo reale.
*   **Arena del Destino**: Configura scontri tattici bilanciati (CA, PF, Strategia) in base a difficoltà e ambiente.

---

## ⚙️ Configurazione API (.env)

L'applicazione supporta una configurazione granulare delle chiavi Gemini per bilanciare il carico dei rate limit. Mappa queste variabili nel tuo file `.env`:

```env
# CHIAVI SPECIFICHE (Consigliate per evitare limiti di quota)
GEMINI_API_KEY_STORY=tua_chiave      # Generazione storie e scene
GEMINI_API_KEY_SUMMARY=tua_chiave    # Biblioteca e Compendio
GEMINI_API_KEY_SHOPS=tua_chiave      # Botteghe e Tesori
GEMINI_API_KEY_WORLD=tua_chiave      # Mappe, Luoghi, PNG e Combattimenti
GEMINI_API_KEY_EXTRACTION=tua_chiave # Scansione automatica bottino/PNG
GEMINI_API_KEY_IMPORT=tua_chiave     # Importazione da manuali (OCR/Testo)
```

---

## 🚀 Installazione con Docker

Il sistema è ottimizzato per girare in ambiente containerizzato (es. su Raspberry Pi o NAS) con persistenza dei dati su supporti esterni.

### Docker Compose
Crea un file `docker-compose.yml` con la seguente configurazione:

```yaml
services:
  app:
    build: 
      context: https://github.com/Valdes301/Chronicle-Weaver.git#main
    container_name: chronicle-weaver-app
    restart: unless-stopped
    image: chronicle-weaver:v1
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/dev.db
      - GEMINI_API_KEY_STORY=TUO_TOKEN
      - GEMINI_API_KEY_SUMMARY=TUO_TOKEN
      - GEMINI_API_KEY_SHOPS=TUO_TOKEN
      - GEMINI_API_KEY_WORLD=TUO_TOKEN
      - GEMINI_API_KEY_EXTRACTION=TUO_TOKEN
      - GEMINI_API_KEY_IMPORT=TUO_TOKEN
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    volumes:
      - /chronicle-weaver/db:/app/data      # Database persistente (es. su SD card)
      - /chronicle-weaver/public:/app/public # Immagini e upload persistenti
```

### Avvio
```bash
docker-compose up -d --build
```

### Manutenzione
Per pulire i builder rimasti in memoria dopo un aggiornamento e risparmiare spazio:
```bash
docker builder prune -f
```

---
*Buon gioco, Dungeon Master. Possa la tua storia essere leggendaria.*