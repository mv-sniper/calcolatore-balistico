# Calcolatore balistico .308 Win

App web installabile (PWA) che funziona **senza rete**. Calcola alzo e deriva in MRAD per .308 Win, palle 168-185 gr, distanze fino a 1100 m, e mostra il reticolo EBR-7C (Vortex Viper PST Gen II 5-25x50) con un punto rosso nel punto di mira.

## Installazione
- **iPhone / iPad**: apri l'indirizzo in Safari, tocca Condividi, poi "Aggiungi alla schermata Home".
- **Android**: apri l'indirizzo in Chrome, menu (tre puntini), "Installa app" oppure "Aggiungi a schermata Home".
- Apri l'app una volta con la rete attiva: da quel momento funziona anche offline. Gli aggiornamenti arrivano da soli quando sei online.

## Dati
- Carabine, cartucce e palle sono salvate **solo sul dispositivo** (memoria del browser). Esporta ogni tanto il backup dalla scheda "Altro".
- Il CSV di Garmin ShotView si importa dal modulo della cartuccia: i colpi lontani dalla mediana sono segnalati e si escludono con un tocco.
- Il collegamento Bluetooth con Kestrel e Garmin non è disponibile: temperatura, pressione di stazione e vento si inseriscono a mano.

## Limiti da conoscere
- Modello a massa puntiforme (come Strelok Pro in modalità standard): conferma sempre con tiri reali e taratura del BC o della velocità.
- Il reticolo disegnato è ricostruito da un'immagine: il punto rosso è esatto in MRAD, il disegno è schematico.
- Non è modellata la sensibilità della polvere alla temperatura.
- L'archivio contiene 54 palle .308 (Sierra, Berger, Lapua, Hornady, Nosler, più le palle delle munizioni Norma e Sellier & Bellot) e 21 munizioni commerciali (Federal, Hornady, Lapua, Norma, Sellier & Bellot, Fiocchi). Ogni voce riporta la fonte (catalogo o scheda del produttore, letti il 17/11/2026). Dove il produttore non pubblica un valore (lunghezza, G7, canna di prova) il campo resta vuoto.
- Le velocità delle munizioni sono quelle dichiarate su canne di prova: misura la tua con il cronografo.
- Le polveri sono solo un elenco di nomi per la registrazione delle ricariche: l'app non contiene dati di carica. Usa i manuali dei produttori.
- Il catalogo Sierra riporta un solo BC senza indicare il modello: nell'app è trattato come G1. Berger 30107 (185 gr Juggernaut OTM Tactical) è escluso perché le fonti Berger si contraddicono.

## Licenze e fonti
- Le tabelle di resistenza standard G1 e G7 sono dati numerici standard, ricavati dalla libreria py-ballisticcalc 3.1.1 (licenza LGPL-3.0). Se l'app viene distribuita ad altri, va rispettata quella licenza o sostituite le tabelle.
- Palla Sierra TMK 175 gr: BC G7 0,267 misurato da Bryan Litz (Applied Ballistics); BC G1 0,545 dichiarato da Sierra (fonte secondaria); lunghezza 1,380" misurata da un recensore. Da confermare con la scatola o il sito Sierra.

## Sviluppo
- Codice in `src/` (JavaScript senza dipendenze a runtime). Costruzione: `npm install` poi `node tools/build.mjs` (crea `web/`).
- Prove: `node test/app_smoke.mjs`, `node test/engine_checks.mjs`, `node test/sanity.mjs`, `node test/units_csv_store.mjs`.
