#!/bin/bash
#
# ensure_databases.sh
# Stellt sicher, dass alle Datenbank-Dateien existieren, bevor Docker gestartet wird.
# Falls Datenbanken fehlen oder gelöscht wurden, werden leere Dateien erstellt.
#

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Datenbank-Prüfung für Link-in-Bio"
echo "=========================================="

# Liste aller benötigten Datenbanken (nur Dateinamen, keine Pfade)
DATABASES=(
    "linktree.db"
    "special_pages.db"
    "pages.db"
    "mediakit.db"
)

# Zähler für fehlende Datenbanken
missing_count=0
error_occurred=false

# Prüfe jede Datenbank
for db in "${DATABASES[@]}"; do
    # Sicherheitsprüfung: Nur sichere Dateinamen erlauben (keine Pfadtraversierung)
    if [[ "$db" =~ [/\\] ]] || [[ "$db" == ".."* ]]; then
        echo -e "${RED}✗${NC} Ungültiger Dateiname: $db"
        error_occurred=true
        continue
    fi

    if [ -f "$db" ]; then
        echo -e "${GREEN}✓${NC} $db existiert"
    else
        echo -e "${YELLOW}⚠${NC} $db fehlt - wird erstellt..."
        if touch "$db" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $db wurde erstellt"
            missing_count=$((missing_count + 1))
        else
            echo -e "${RED}✗${NC} Fehler beim Erstellen von $db"
            error_occurred=true
        fi
    fi
done

echo ""
echo "=========================================="
if [ "$error_occurred" = true ]; then
    echo -e "${RED}Fehler bei der Datenbank-Prüfung aufgetreten.${NC}"
    exit 1
elif [ $missing_count -eq 0 ]; then
    echo -e "${GREEN}Alle Datenbanken sind vorhanden.${NC}"
else
    echo -e "${YELLOW}$missing_count Datenbank(en) wurden erstellt.${NC}"
    echo "Die Datenbanken werden beim nächsten Start initialisiert."
fi
echo "=========================================="

exit 0
