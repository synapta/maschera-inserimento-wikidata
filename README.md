# WLM Sito Autorizzazioni

Questo è il codice sorgente del sito delle autorizzazioni di
Wiki Loves Monuments di Wikimedia Italia, commissionato da Wikimedia Italia e
implementato da Synapta.

https://autorizzazioni.wikilovesmonuments.it/

Il sito è stato ideato per dare agli enti un percorso semplificato per caricare
un'autorizzazione per Wiki Loves Monuments.

Qui ulteriori informazioni sul progetto:

https://wiki.wikimedia.it/wiki/Maschera_di_inserimento_delle_autorizzazioni_per_Wiki_Loves_Monuments_su_WikiData

## Sviluppo

Il progetto è stato scritto in NodeJS. La versione testata è la `12.0.0`.

Installazione delle dipendenze:

```
npm install
```

Lancio dell'applicazione:

```
node server.js
```

L'applicativo resta in ascolto sulla porta 8080.

## Configurazione

Occorre creare un file `.env` che contenga:

```
MEDIAWIKI_CONSUMER_KEY=<key>
MEDIAWIKI_CONSUMER_SECRET=<secret>
NEXTCLOUD_USERNAME=<username>
NEXTCLOUD_PASSWORD=<password>
NEXTCLOUD_URL=<url al webdav di nextcloud>
```

In particolare per il collegamento OAuth con i progetti Wikimedia i primi due vanno
ottenuti seguendo la relativa procedura:

* https://www.mediawiki.org/wiki/OAuth/For_Developers

I parametri legati a Nextcloud invece dipendono dalla propria installazione.

È possibile che il tool funzioni anche con altri strumenti che utilizzano
lo stesso protocollo usato da Nextcloud.

## Collaborazione

Per collaborare consigliamo di visitare il repository principale e cliccare su "Fork":

https://gitlab.wikimedia.org/repos/wikimedia-it/wlm/wlm-sito-autorizzazioni

In seguito potrai caricare le tue modifiche su git e cliccare su "Create merge request".

Ti ringraziamo per ogni correzione o miglioria che desideri inviare a questo progetto!

# Segnalazioni

Il luogo più adatto per una segnalazione è su Wikimedia Phabricator:

* [Crea un Task su Wikimedia Phabricator](https://phabricator.wikimedia.org/maniphest/task/edit/form/43/?tags=wmit-infrastructure&title=[wlm-sito-autorizzazioni]%20Segnalazione%20...)
* [Vedi elenco degli ultimi Task](https://phabricator.wikimedia.org/search/query/y7XtB3O973pl/)

Se hai bisogno di inviare una segnalazione generica prova da qui:

https://wiki.wikimedia.it/wiki/Infrastruttura

## Licenza

Copyright (C) 2020, 2021 [Synapta](https://synapta.it/)

Copyright (C) 2022 [rispettivi contributori](https://gitlab.wikimedia.org/repos/wikimedia-it/wlm/wlm-sito-autorizzazioni/-/commits/main)

Questo programma è software libero: puoi ridistribuirlo e/o modificarlo
seguendo i termini della GNU General Public License pubblicata
dalla Free Software Foundation, sia la versione 3 della Licenza, che
(a tua scelta) una qualsiasi versione successiva.

Questo programma è distribuito nella speranza che possa essere utile,
ma viene fornito SENZA NESSUNA GARANZIA.

Vedi la GNU General Public License per ulteriori dettagli.

Dovresti aver ricevuto una copia della GNU General Public License
insieme a questo programma. In caso contrario, vedi <https://www.gnu.org/licenses/>.
