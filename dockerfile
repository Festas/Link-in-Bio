# Wir nutzen ein schlankes Python-Image
FROM python:3.11-slim

# Arbeitsverzeichnis
WORKDIR /app

# Umgebungsvariablen
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System-Pakete aktualisieren und WICHTIGE Bibliotheken installieren
# curl, libffi-dev und libcurl4 sind wichtig für curl_cffi
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libffi-dev \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 1. Requirements installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Code kopieren
COPY . .

# 3. Vendor laden
RUN python download_vendor.py

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
