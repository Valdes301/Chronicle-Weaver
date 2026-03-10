Cronache: Il Tuo Co-Dungeon Master Potenziato dall'IA

**Tessitore di Cronache** è un'applicazione web completa per Dungeon Master di D&D 5e, progettata per semplificare la gestione delle campagne e stimolare la creatività. Sfruttando la potenza di Google Gemini attraverso Genkit, questo strumento agisce come un assistente intelligente, aiutandoti a generare contenuti, tenere traccia della storia e creare materiale di gioco personalizzato.

L'applicazione è interamente containerizzata con Docker per un avvio rapido e un ambiente di sviluppo isolato.

---

## ✨ Funzionalità Principali

### Gestione della Campagna
- **Database Completo**: Gestisci Campagne, Sessioni, Personaggi Giocanti (PG), Mostri, Oggetti Magici, Incantesimi e Abilità personalizzate.
- **Cronologia Interattiva**: Visualizza la storia della tua campagna come una timeline di sessioni. Riordina gli eventi con un semplice drag-and-drop.
- **Schede Personaggio Dettagliate**: Crea e modifica le schede dei tuoi giocatori, che verranno usate dall'IA per personalizzare le scene.
- **Backup e Ripristino**: Esporta l'intero stato delle tue campagne in un singolo file JSON e ripristinalo in qualsiasi momento.

### Strumenti Potenziati dall'IA (Google Gemini)
- **Generatore di Storie**: Scrivi un prompt e lascia che l'IA crei una bozza dettagliata per la tua prossima sessione, basandosi sul contesto attuale della campagna, sui personaggi e sul tuo riassunto generale.
- **Inizializzazione Campagna**: Parti da zero con nuove idee generate dall'IA per luoghi, PNG e spunti di trama.
- **Sommario Intelligente**: L'IA analizza l'intera cronologia della campagna e crea un riassunto denso di informazioni, che userà come "memoria a lungo termine" per le future generazioni.
- **Estrattore di Entità**: Dopo ogni sessione, l'IA analizza le note e aggiunge automaticamente nuovi mostri e oggetti magici al database della campagna.
- **Importatore di Contenuti**: Incolla testo libero o JSON da manuali esterni. L'IA analizzerà, strutturerà e importerà i dati nel tuo bestiario, nel database degli oggetti e nel libro degli incantesimi.
- **Generatore di Mappe**: Descrivi una mappa e ottieni un file SVG in stile "vecchia scuola", pronto per essere usato o modificato.

### Creazione di Materiale di Gioco
- **Generatore di Carte Completo**: Seleziona oggetti e incantesimi e crea fogli A4 pronti per la stampa, con un layout fronte-retro pieghevole.
- **Layout di Stampa Ottimizzato**: Le carte sono disposte per massimizzare lo spazio sul foglio (A4 orizzontale) e garantire una stampa a 300 DPI di alta qualità.
- **Personalizzazione Carte**: Carica le tue immagini per personalizzare il fronte e il retro delle carte da gioco, rendendo il tuo materiale unico.

---

## 🚀 Stack Tecnologico
- **Frontend**: Next.js, React, TypeScript, ShadCN UI, Tailwind CSS
- **Backend & AI**: Genkit (Google Gemini), Node.js
- **Database**: Better-SQLite3
- **Deployment**: Docker, Docker Compose

---

## 🏁 Avvio Rapido

1.  **Clona il repository:**
    ```bash
    git clone <URL_DEL_TUO_REPOSITORY>
    cd <NOME_DELLA_CARTELLA>
    ```

2.  **Crea il file di ambiente:**
    Crea un file `.env` nella root del progetto e aggiungi le tue API key per Google Gemini:
    ```env
    GEMINI_API_KEY_STORY="xxxx"
    GEMINI_API_KEY_SUMMARY="yyyy"
    ```
    *Puoi usare la stessa chiave per entrambe le variabili se preferisci.*

3.  **Avvia con Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    Questo comando costruirà l'immagine Docker e avvierà l'applicazione. I dati del database verranno salvati in una cartella `./data` per la persistenza.

4.  **Accedi all'applicazione:**
    Apri il tuo browser e vai su `http://localhost:3000`.

Ora sei pronto per iniziare a tessere le tue cronache!
