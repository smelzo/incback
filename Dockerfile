FROM node:18-alpine

# Installa rsync necessario per il funzionamento del tool
RUN apk add --no-cache rsync openssh-client

WORKDIR /app

# Copia i file di configurazione per le dipendenze
COPY package*.json ./

# Installa tutte le dipendenze (incluse devDependencies per il build)
RUN npm ci

# Copia il codice sorgente
COPY . .

# Build del progetto
RUN npm run build

# Rimuove le devDependencies per ridurre la dimensione dell'immagine
RUN npm prune --production

# Installa globalmente il CLI dal build locale
RUN npm install -g .

# Directory di lavoro dove l'utente può montare volumi o mettere il file .incback
WORKDIR /backup

# Percorsi usati per montare la sorgente e la destinazione dell'host
VOLUME ["/source", "/dest"]

# Imposta l'entrypoint per il comando incback
ENTRYPOINT ["incback"]
# Mostra l'help di default se non vengono passati argomenti
CMD ["--help"]
