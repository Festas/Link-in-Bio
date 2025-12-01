#!/bin/bash
#
# entrypoint.sh
# Initializes the application before starting the main process.
# This script ensures all databases and directories exist.
#

# Exit immediately if any command fails (includes pipefail behavior)
set -e

echo "=========================================="
echo "Starting Link-in-Bio Application"
echo "=========================================="

# Ensure data directory exists
echo "Checking data directory..."
mkdir -p /app/data
mkdir -p /app/static/uploads

# Initialize databases
echo "Initializing databases..."
python init_databases.py

echo "=========================================="
echo "Initialization complete. Starting server..."
echo "=========================================="

# Execute the main command
exec "$@"
