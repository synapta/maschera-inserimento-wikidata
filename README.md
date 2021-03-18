# maschera-inserimento-wikidata

Versione di node testata `12.0.0`

Installare le dipendenze con
```
npm install
```

Lanciare l'applicazione con
```
node server.js
```

Occorre creare un file `.env` che contenga
```
MEDIAWIKI_CONSUMER_KEY=<key>
MEDIAWIKI_CONSUMER_SECRET=<secret>
NEXTCLOUD_USERNAME=<username>
NEXTCLOUD_PASSWORD=<password>
NEXTCLOUD_URL=<url al webdav di nextcloud>
```

In particolare i primi due vanno ottenuti dalla WMF. I tre dati di nextcloud invece
dipendono dalla propria installazione. È possibile questo tool funzioni anche con
strumenti che utilizzano lo stesso protocollo di Nextcloud ma non abbiamo fatto test
in merito.
