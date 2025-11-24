.PHONY: help install dev test lint format clean run docker-build docker-up docker-down ensure-db

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
	rm -f linktree.db

run:  ## Run development server
	python main.py

docker-build:  ## Build Docker image
	docker-compose build

ensure-db:  ## Ensure all database files exist before Docker start
	@chmod +x ensure_databases.sh
	@./ensure_databases.sh

docker-up: ensure-db  ## Start Docker containers (ensures databases exist first)
	docker-compose up -d

docker-down:  ## Stop Docker containers
	docker-compose down

docker-logs:  ## View Docker logs
	docker-compose logs -f

backup:  ## Create database backup
	@mkdir -p backups
	@cp linktree.db backups/linktree_$(shell date +%Y%m%d_%H%M%S).db
	@echo "Backup created in backups/"

vendor:  ## Download vendor files
	python download_vendor.py

init:  ## Initialize project (install deps + vendor files)
	make install
	make vendor
	@echo "Project initialized! Run 'make run' to start the server."
