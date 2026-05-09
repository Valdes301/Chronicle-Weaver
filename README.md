# 📜 Tessitore di Cronache

**Tessitore di Cronache** è l'assistente definitivo per Dungeon Master di D&D 5e. Alimentato da **Google Gemini**, trasforma la gestione della tua campagna in un'esperienza fluida, creativa e organizzata.

---

## ⚙️ Configurazione API (.env)

Per funzionare, l'app richiede almeno una chiave API di Google Gemini. Puoi usare una sola chiave per tutto o suddividerle per evitare errori di "Too Many Requests" (429) durante sessioni intense.

Crea un file `.env` nella root del progetto e inserisci:

```env
# CHIAVE MASTER (Obbligatoria)
# Usata per la generazione delle storie e come fallback per tutte le altre funzioni.
GEMINI_API_KEY_STORY=tua_chiave_qui

# CHIAVI OPZIONALI (Per scalare le performance)
# Se non inserite, il sistema userà automaticamente la chiave STORY.

# Usata per i riassunti in Biblioteca e il Compendio Globale.
GEMINI_API_KEY_SUMMARY=tua_chiave_qui

# Usata per Generatore di Botteghe e Tesori.
GEMINI_API_KEY_SHOPS=tua_chiave_qui

# Usata per Architetto di Mondi, PNG e Combattimenti.
GEMINI_API_KEY_WORLD=tua_chiave_qui

# Usata per l'estrazione automatica di oggetti/mostri dalle storie.
GEMINI_API_KEY_EXTRACTION=tua_chiave_qui

# Usata per l'Importazione Intelligente da Manuali (testo/foto).
GEMINI_API_KEY_IMPORT=tua_chiave_qui
```

---

## ✨ Funzionalità nel Dettaglio

### 🧠 Gestione Avanzata della Memoria
*   **Sintesi Incrementale (Biblioteca)**: Invece di riassumere ore di gioco in un colpo solo, puoi selezionare 3-4 storie alla volta. L'IA legge il riassunto precedente e lo aggiorna con i nuovi fatti. È efficiente, risparmia token e mantiene i dettagli.
*   **Compendio Globale**: Ogni arco narrativo concluso finisce nella memoria a lungo termine. Quando generi nuove storie, l'IA "ricorda" i grandi eventi dei mesi passati.
*   **Timeline Interattiva**: Trascina le storie nella Dashboard per riordinarle. Il sistema gestisce i numeri di sessione evitando duplicati e garantendo la coerenza cronologica per l'IA.
*   **Reset della Memoria**: Se un riassunto non ti soddisfa, puoi resettare la memoria dell'arco attivo per ricominciare la sintesi da zero.

### 🛠️ Strumenti Creativi IA
*   **Generatore di Storie**: Scrivi un prompt e l'IA propone la scena successiva, calcola i PE (XP) e permette modifiche testuali prima di confermare.
*   **Architetto di Mondi**: Crea luoghi con descrizioni sensoriali (Vista, Udito, Olfatto), punti di interesse interattivi e un "Segreto del Master" per colpi di scena improvvisi.
*   **Emporio dei Volti (PNG)**: Genera personaggi con psicologia profonda, tratti distintivi, segreti inconfessabili e ganci narrativi per coinvolgere i giocatori.
*   **Arena del Destino**: Configura scontri tattici in base a difficoltà e ambiente. L'IA genera statistiche rapide (CA, PF, Danni) e strategie di combattimento per i nemici.
*   **Generatore di Tesori**: Crea bottini coerenti con il luogo (es. "corpo di un orco" vs "scomparto segreto"). Include monete, gioielli e oggetti magici o maledetti.

### 🔍 Analisi e Importazione
*   **Scansione del Bottino**: Con un tasto, l'IA analizza una storia appena scritta ed estrae automaticamente nuovi oggetti magici, mostri incontrati e aggiorna la cronologia dei personaggi.
*   **Importazione Intelligente**: Incolla il testo di un manuale o scatta una foto a una pagina fisica. L'IA strutturerà dati tecnici, costi, rarità e descrizioni direttamente nel tuo database.

### 🃏 Materiale di Gioco Professionale
*   **Generatore di Carte (Handouts)**: Trasforma oggetti e magie in carte fisiche pronte per la stampa (5.6 x 8.8 cm). Supporta layout A4 con 9 carte per foglio o layout sperimentali pieghevoli fronte-retro.
*   **Editor Tipografico (Lettere)**: Crea lettere, ordini di missione o proclami reali con font calligrafici, stemmi caricabili e sigilli in cera lacca. Esporta in 600 DPI per una qualità di stampa superiore.
*   **Personalizzazione Estetica**: Carica le tue texture per il fronte e il retro delle carte per adattarle allo stile della tua ambientazione.

### 💾 Sistema e Sicurezza
*   **Backup JSON**: Esporta l'intera campagna (storie, oggetti, PNG, mappe) in un singolo file. Puoi ripristinarlo su qualsiasi dispositivo o conservarlo come archivio storico.
*   **Multi-Campagna**: Gestisci più gruppi di gioco contemporaneamente passando da una cronaca all'altra dal menu principale.

---

## 🚀 Installazione Rapida

1.  **Docker**: Assicurati di avere Docker installato.
2.  **Configurazione**: Rinomina `.env.example` in `.env` e inserisci le tue chiavi API.
3.  **Avvio**:
    ```bash
    docker-compose up --build
    ```
4.  **Accesso**: Vai su `http://localhost:3000`.

---
*Buon gioco, Dungeon Master. Possa la tua storia essere leggendaria.*