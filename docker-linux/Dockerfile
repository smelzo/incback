FROM --platform=linux/amd64 node:20

WORKDIR /app

# Copiamo tutto il progetto
COPY . .

# Rimuoviamo i node_modules esistenti (che potrebbero essere per Mac) e reinstalliamo per Linux
RUN rm -rf node_modules && npm install

# Debug: Verifichiamo l'architettura
RUN echo "Architecture check:" && uname -m && node -p "process.arch"

# Eseguiamo il comando di build interno
CMD ["npm", "run", "build:linux:internal"]
