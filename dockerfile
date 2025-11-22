# Wir nutzen ein schlankes Python-Image
FROM python:3.11-slim

# Arbeitsverzeichnis
WORKDIR /app

# Umgebungsvariablen
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System-Pakete aktualisieren und WICHTIGE Bibliotheken installieren
# curl, libffi-dev und libcurl4 sind wichtig für curl_cffi
# Playwright dependencies für Browser-Scraping
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libffi-dev \
    libcurl4-openssl-dev \
    # Playwright browser dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# 1. Requirements installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Playwright Browser installieren (Chromium)
RUN playwright install chromium --with-deps

# 3. Code kopieren
COPY . .

# 4. Vendor laden
RUN python download_vendor.py

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
