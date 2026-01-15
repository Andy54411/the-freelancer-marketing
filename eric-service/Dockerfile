FROM python:3.12-slim

WORKDIR /app

# Systemabhängigkeiten installieren
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# ERiC-Verzeichnisse erstellen
RUN mkdir -p /opt/taskilo/eric/lib \
    /opt/taskilo/eric/plugins \
    /opt/taskilo/eric/certificates \
    /opt/taskilo/logs/eric

# Python-Abhängigkeiten installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Anwendung kopieren
COPY main.py .

# Umgebungsvariablen
ENV ERIC_HOME=/opt/taskilo/eric/lib
ENV ERIC_LOG_DIR=/opt/taskilo/logs/eric
ENV ERIC_CERT_DIR=/opt/taskilo/eric/certificates
ENV LD_LIBRARY_PATH=/opt/taskilo/eric/lib

# Port
EXPOSE 8001

# Starten
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
