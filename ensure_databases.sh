#!/bin/bash
#
# ensure_databases.sh
# Stellt sicher, dass alle Datenbank-Dateien existieren, bevor Docker gestartet wird.
# Falls Datenbanken fehlen oder gelöscht wurden, werden leere Dateien erstellt.
#

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Datenbank-Prüfung für Link-in-Bio"
echo "=========================================="

# Liste aller benötigten Datenbanken
DATABASES=(
    "linktree.db"
    "special_pages.db"
    "pages.db"
    "mediakit.db"
)

# Zähler für fehlende Datenbanken
missing_count=0

# Prüfe jede Datenbank
for db in "${DATABASES[@]}"; do
    if [ -f "$db" ]; then
        echo -e "${GREEN}✓${NC} $db existiert"
    else
        echo -e "${YELLOW}⚠${NC} $db fehlt - wird erstellt..."
        touch "$db"
        echo -e "${GREEN}✓${NC} $db wurde erstellt"
        missing_count=$((missing_count + 1))
    fi
done

echo ""
echo "=========================================="
if [ $missing_count -eq 0 ]; then
    echo -e "${GREEN}Alle Datenbanken sind vorhanden.${NC}"
else
    echo -e "${YELLOW}$missing_count Datenbank(en) wurden erstellt.${NC}"
    echo "Die Datenbanken werden beim nächsten Start initialisiert."
fi
echo "=========================================="

exit 0
