# Wir nutzen ein schlankes Python-Image (spart Speicherplatz)
FROM python:3.11-slim

# Arbeitsverzeichnis im Container
WORKDIR /app

# Umgebungsvariablen für Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Abhängigkeiten installieren
COPY requirements.txt .
RUN pip install fastapi uvicorn[standard] jinja2 requests beautifulsoup4 python-dotenv httpx qrcode[pil] python-multipart curl_cffi ddgs

# Den Rest des Codes kopieren
COPY . .

# WICHTIG: Vendor-Dateien im Container herunterladen (Offline-Fähigkeit)
# Falls der Download wegen Firewall scheitert, wird das im Skript abgefangen.
RUN python download_vendor.py

# Port 8000 freigeben
EXPOSE 8000

# Start-Befehl
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
