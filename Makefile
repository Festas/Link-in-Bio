.PHONY: help install dev test lint format clean run docker-build docker-up docker-down ensure-db minify

help:  ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install:  ## Install production dependencies
	pip install -r requirements.txt

dev:  ## Install development dependencies
	pip install -r requirements.txt
	pip install pytest pytest-asyncio pytest-cov black flake8 mypy

test:  ## Run tests
	pytest tests/ -v

test-cov:  ## Run tests with coverage
	pytest tests/ --cov=. --cov-report=html --cov-report=term

lint:  ## Run linting checks
	flake8 .
	mypy .

format:  ## Format code with black
	black .

format-check:  ## Check code formatting
	black --check .

clean:  ## Clean up generated files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name htmlcov -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	rm -rf data/*.db
	rm -rf static/dist

run:  ## Run development server
	python main.py

docker-build:  ## Build Docker image
	docker-compose build

ensure-db:  ## Ensure all database files exist before Docker start
	@if [ -f ensure_databases.sh ]; then \
		chmod +x ensure_databases.sh && ./ensure_databases.sh; \
	else \
		echo "Warning: ensure_databases.sh not found, skipping database check"; \
	fi

docker-up: ensure-db  ## Start Docker containers (ensures databases exist first)
	docker-compose up -d

docker-down:  ## Stop Docker containers
	docker-compose down

docker-logs:  ## View Docker logs
	docker-compose logs -f

backup:  ## Create database backup (all databases in data/)
	@mkdir -p backups
	@for db in data/*.db; do \
		if [ -f "$$db" ]; then \
			cp "$$db" "backups/$$(basename $$db .db)_$$(date +%Y%m%d_%H%M%S).db"; \
		fi \
	done
	@echo "Backup created in backups/"

vendor:  ## Download vendor files
	python download_vendor.py

init:  ## Initialize project (install deps + vendor files + data dir)
	make install
	make vendor
	@mkdir -p data
	@echo "Project initialized! Run 'make run' to start the server."

# --- Asset Optimization ---

minify-css:  ## Minify CSS files for production
	@echo "Minifying CSS files..."
	@mkdir -p static/dist/css
	@for file in static/css/*.css; do \
		if [ -f "$$file" ]; then \
			filename=$$(basename "$$file" .css); \
			cat "$$file" | sed 's/\/\*.*\*\///g' | tr -d '\n' | sed 's/  */ /g' > "static/dist/css/$${filename}.min.css"; \
			echo "  Minified: $$file -> static/dist/css/$${filename}.min.css"; \
		fi \
	done
	@echo "CSS minification complete!"

minify-js:  ## Minify JS files for production (requires terser: npm install -g terser)
	@echo "Minifying JS files..."
	@mkdir -p static/dist/js
	@if command -v terser >/dev/null 2>&1; then \
		for file in static/js/*.js; do \
			if [ -f "$$file" ]; then \
				filename=$$(basename "$$file" .js); \
				terser "$$file" -o "static/dist/js/$${filename}.min.js" --compress --mangle 2>/dev/null || \
					cp "$$file" "static/dist/js/$${filename}.min.js"; \
				echo "  Minified: $$file -> static/dist/js/$${filename}.min.js"; \
			fi \
		done; \
	else \
		echo "  Warning: terser not found. Install with: npm install -g terser"; \
		echo "  Copying JS files without minification..."; \
		for file in static/js/*.js; do \
			if [ -f "$$file" ]; then \
				filename=$$(basename "$$file" .js); \
				cp "$$file" "static/dist/js/$${filename}.min.js"; \
			fi \
		done; \
	fi
	@echo "JS processing complete!"

minify: minify-css minify-js  ## Minify all static assets for production
	@echo ""
	@echo "=========================================="
	@echo "Asset optimization complete!"
	@echo "Minified files are in static/dist/"
	@echo ""
	@echo "For production, configure Caddy to serve"
	@echo "from static/dist/ with gzip compression"
	@echo "=========================================="

build-assets: minify  ## Build and optimize static assets
	@echo "Generating asset manifest..."
	@echo '{"generated":"'$$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","files":{' > static/dist/manifest.json
	@first=true; \
	for file in static/dist/css/*.min.css static/dist/js/*.min.js; do \
		if [ -f "$$file" ]; then \
			hash=$$(md5sum "$$file" | cut -c1-8); \
			relpath=$$(echo "$$file" | sed 's|static/dist/||'); \
			if [ "$$first" = true ]; then \
				first=false; \
			else \
				echo ',' >> static/dist/manifest.json; \
			fi; \
			echo -n "\"$$relpath\":\"$$hash\"" >> static/dist/manifest.json; \
		fi \
	done
	@echo '}}' >> static/dist/manifest.json
	@echo "Asset manifest generated: static/dist/manifest.json"
