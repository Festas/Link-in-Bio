# Contributing to Link-in-Bio

Vielen Dank für dein Interesse, zu Link-in-Bio beizutragen! 🎉

## 🚀 Getting Started

1. **Fork das Repository** auf GitHub
2. **Clone deinen Fork** lokal:
   ```bash
   git clone https://github.com/dein-username/Link-in-Bio.git
   cd Link-in-Bio
   ```
3. **Erstelle einen Feature Branch**:
   ```bash
   git checkout -b feature/dein-feature-name
   ```

## 💻 Development Setup

### Voraussetzungen

- Python 3.11+
- pip
- virtualenv (empfohlen)

### Installation

1. **Virtuelle Umgebung erstellen**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Dependencies installieren**:
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-asyncio black flake8 mypy
   ```

3. **Umgebungsvariablen setzen**:
   ```bash
   cp .env.example .env
   # .env nach Bedarf anpassen
   ```

4. **Server starten**:
   ```bash
   python main.py
   ```

## 🧪 Testing

Bitte stelle sicher, dass alle Tests durchlaufen, bevor du einen Pull Request öffnest:

```bash
# Alle Tests ausführen
pytest

# Mit Coverage Report
pytest --cov=. --cov-report=html

# Nur spezifische Tests
pytest tests/test_main.py -v
```

### Neue Tests hinzufügen

- Für neue Features: Füge entsprechende Tests hinzu
- Für Bugfixes: Füge einen Test hinzu, der den Bug reproduziert
- Tests sollten in `tests/` abgelegt werden
- Verwende `pytest` Konventionen

## 📝 Code Style

Wir verwenden Python-Standards und Best Practices:

### Formatting

```bash
# Code formatieren mit Black
black .

# Nur prüfen ohne Änderungen
black --check .
```

### Linting

```bash
# Code-Qualität prüfen
flake8 .
```

### Type Hints

```bash
# Type Checking mit mypy
mypy .
```

### Style Guidelines

- **PEP 8**: Folge den Python Style Guidelines
- **Type Hints**: Verwende Type Hints für alle Funktionen
- **Docstrings**: Dokumentiere Klassen und komplexe Funktionen
- **Kommentare**: Nur wenn nötig - Code sollte selbsterklärend sein
- **Deutsche Strings**: UI-Strings auf Deutsch (da deutsche App)
- **Englische Logs**: Log-Messages auf Englisch

## 🔒 Sicherheit

### Security Checklist

- [ ] Keine Secrets im Code (verwende `.env`)
- [ ] Input Validation für alle User-Inputs
- [ ] SQL Injection Prevention (parametrisierte Queries)
- [ ] XSS Prevention (Template Auto-Escaping)
- [ ] CSRF Protection für State-Changing Operations
- [ ] Rate Limiting für kritische Endpoints

### Sicherheitslücken melden

**Bitte melde Sicherheitslücken NICHT öffentlich!**

Sende eine E-Mail an die Repository-Maintainer oder öffne ein privates Security Advisory auf GitHub.

## 📦 Pull Request Process

1. **Update Tests**: Füge Tests für neue Features hinzu
2. **Update Docs**: Aktualisiere README.md wenn nötig
3. **Commit Messages**: Verwende aussagekräftige Commit Messages
   - Format: `type: kurze Beschreibung`
   - Typen: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Beispiel: `feat: add dark mode toggle`
4. **Keep it Small**: Kleinere PRs werden schneller reviewed
5. **Update CHANGELOG**: Füge deine Änderungen hinzu (falls vorhanden)

### Commit Message Guidelines

```
feat: add new feature
fix: fix bug in component
docs: update README
style: format code with black
refactor: restructure database module
test: add tests for auth
chore: update dependencies
```

## 🐛 Bug Reports

Beim Melden von Bugs bitte folgendes angeben:

- **Beschreibung**: Was ist das Problem?
- **Reproduktion**: Schritte zum Reproduzieren
- **Erwartetes Verhalten**: Was sollte passieren?
- **Aktuelles Verhalten**: Was passiert stattdessen?
- **Environment**: OS, Python-Version, Browser
- **Screenshots**: Falls relevant
- **Logs**: Relevante Error Messages

## 💡 Feature Requests

Feature Requests sind willkommen! Bitte beschreibe:

- **Use Case**: Warum ist das Feature nützlich?
- **Vorschlag**: Wie sollte es implementiert werden?
- **Alternativen**: Gibt es andere Lösungsansätze?
- **Mockups**: Visuelle Darstellung (falls UI-Feature)

## 📋 Development Workflow

### Database Changes

Bei Änderungen an der Datenbank-Struktur:

1. Update `database.py` Schema
2. Füge Migration in `init_db()` hinzu
3. Teste mit leerer und bestehender Datenbank
4. Update `models.py` wenn nötig

### API Changes

Bei Änderungen an API Endpoints:

1. Update entsprechende Pydantic Models
2. Update OpenAPI Docs (automatisch)
3. Teste mit FastAPI Test Client
4. Update Frontend wenn nötig

### Frontend Changes

Bei Änderungen am Frontend:

1. Teste in verschiedenen Browsern
2. Teste responsive Design
3. Prüfe Console auf Errors
4. Teste mit und ohne JavaScript

## 🎯 Priority Areas

Aktuell suchen wir besonders nach Hilfe bei:

- [ ] Test Coverage erhöhen
- [ ] Dokumentation verbessern
- [ ] Performance-Optimierungen
- [ ] Accessibility verbessern
- [ ] Internationalisierung (i18n)
- [ ] Mobile App (PWA Verbesserungen)

## 📞 Fragen?

Bei Fragen:

1. Prüfe die [README.md](README.md)
2. Schaue in bestehende Issues
3. Öffne ein neues Issue mit dem Label "question"

## 🙏 Thank You!

Vielen Dank für deinen Beitrag zu Link-in-Bio! Jede Hilfe - ob Code, Dokumentation, Bug Reports oder Feature Requests - ist wertvoll und geschätzt! ❤️
