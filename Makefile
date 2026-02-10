# OctoCAT Supply Chain Management - Makefile
# Cross-platform compatible (Linux, macOS, Windows with Git Bash or WSL)

# Detect OS for platform-specific commands
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
    RM_RF = powershell -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
    MKDIR_P = powershell -Command "New-Item -ItemType Directory -Force -Path"
else
    DETECTED_OS := $(shell uname -s)
    RM_RF = rm -rf
    MKDIR_P = mkdir -p
endif

API_DIR := api
FRONTEND_DIR := frontend

.DEFAULT_GOAL := help

##@ General

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: info
info: ## Show detected OS and directories
	@echo "Detected OS:        $(DETECTED_OS)"
	@echo "API Directory:      $(API_DIR)"
	@echo "Frontend Directory: $(FRONTEND_DIR)"

##@ Installation

.PHONY: install
install: ## Install all dependencies
	cd $(API_DIR) && npm install
	cd $(FRONTEND_DIR) && npm install

##@ Development

.PHONY: dev
dev: ## Start development servers (API + Frontend)
ifeq ($(OS),Windows_NT)
	npx concurrently --kill-others "cd $(API_DIR) && npm run dev" "cd $(FRONTEND_DIR) && set VITE_API_URL=http://localhost:3000 && npm run dev"
else
	@trap 'kill 0' INT; \
	(cd $(API_DIR) && npm run dev) & \
	(cd $(FRONTEND_DIR) && VITE_API_URL=http://localhost:3000 npm run dev) & \
	wait
endif

.PHONY: dev-api
dev-api: ## Start only the API development server
	cd $(API_DIR) && npm run dev

.PHONY: dev-frontend
dev-frontend: ## Start only the frontend development server
	cd $(FRONTEND_DIR) && npm run dev

##@ Database

.PHONY: db-init
db-init: ## Initialize database schema
	cd $(API_DIR) && npm run db:init

.PHONY: db-seed
db-seed: ## Initialize and seed database with sample data
	cd $(API_DIR) && npm run db:seed

##@ Building

.PHONY: build
build: ## Build all projects
	cd $(API_DIR) && npm run build
	cd $(FRONTEND_DIR) && npm run build

.PHONY: build-api
build-api: ## Build only the API
	cd $(API_DIR) && npm run build

.PHONY: build-frontend
build-frontend: ## Build only the frontend
	cd $(FRONTEND_DIR) && npm run build

##@ Testing

.PHONY: test
test: ## Run all tests
	cd $(API_DIR) && npm run test
	cd $(FRONTEND_DIR) && npm run test

.PHONY: test-api
test-api: ## Run API tests
	cd $(API_DIR) && npm run test

.PHONY: test-frontend
test-frontend: ## Run frontend tests
	cd $(FRONTEND_DIR) && npm run test

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	cd $(FRONTEND_DIR) && npm run test:e2e

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	cd $(API_DIR) && npm run test:coverage

##@ Linting

.PHONY: lint
lint: ## Lint all code
	cd $(API_DIR) && npm run lint
	cd $(FRONTEND_DIR) && npm run lint

.PHONY: lint-fix
lint-fix: ## Lint and auto-fix issues
	cd $(API_DIR) && npm run lint:fix
	cd $(FRONTEND_DIR) && npm run lint -- --fix

.PHONY: format
format: ## Format code with prettier
	npx prettier --write "$(API_DIR)/**/*.{ts,tsx}" "$(FRONTEND_DIR)/**/*.{ts,tsx}"

##@ Code Generation

.PHONY: swagger
swagger: ## Regenerate Swagger/OpenAPI spec (api-swagger.json)
	cd $(API_DIR) && npm run swagger:generate

##@ Production

.PHONY: start
start: ## Start production server
	cd $(API_DIR) && npm start

##@ Docker

.PHONY: docker-build
docker-build: ## Build Docker images
	docker-compose build

.PHONY: docker-up
docker-up: ## Start Docker containers
	docker-compose up

.PHONY: docker-down
docker-down: ## Stop Docker containers
	docker-compose down

##@ Cleaning

.PHONY: clean
clean: ## Clean build artifacts and dependencies
	$(RM_RF) node_modules $(API_DIR)/node_modules $(FRONTEND_DIR)/node_modules
	$(RM_RF) $(API_DIR)/dist $(FRONTEND_DIR)/dist
ifeq ($(OS),Windows_NT)
	$(RM_RF) $(API_DIR)/*.db,$(API_DIR)/*.db-*
else
	$(RM_RF) $(API_DIR)/*.db $(API_DIR)/*.db-*
endif
