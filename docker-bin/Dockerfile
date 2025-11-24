FROM debian:stable-slim

# Installiamo rsync e ssh client perché incback li usa "sotto il cofano"
# NON installiamo Node.js per verificare che il binario sia standalone
RUN apt-get update && apt-get install -y \
    rsync \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Il binario verrà montato a runtime, quindi qui non copiamo nulla
# Definiamo solo il comando di default (che verrà sovrascritto dal test)
CMD ["/app/incback", "--help"]
