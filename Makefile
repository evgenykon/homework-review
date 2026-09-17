COMPOSE ?= docker compose
PROD_COMPOSE ?= docker compose -f docker-compose.yml -f docker-compose.prod.yml

.DEFAULT_GOAL := help

.PHONY: help build build-dev build-prod dev up down logs ps restart prod install typecheck db-generate db-migrate db-deploy db-shell backend-shell frontend-shell clean reset-db

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

build: build-dev ## Собрать dev-образы (алиас build-dev)

build-dev: ## Собрать dev-образы
	$(COMPOSE) build

dev: build-dev ## Запустить dev-окружение с hot-reload (foreground)
	$(COMPOSE) up

up: build-dev ## Собрать dev-образы и запустить dev-окружение в фоне
	$(COMPOSE) up -d

down: ## Остановить контейнеры
	$(COMPOSE) down

logs: ## Смотреть логи всех сервисов
	$(COMPOSE) logs -f

ps: ## Статус сервисов
	$(COMPOSE) ps

restart: down up ## Перезапустить dev-окружение

build-prod: ## Собрать production-образы
	$(PROD_COMPOSE) build

prod: ## Запустить production-окружение в фоне
	$(PROD_COMPOSE) up -d --build

install: ## Установить зависимости внутри контейнеров (на хосте ничего не ставится)
	$(COMPOSE) run --rm --no-deps backend bun install
	$(COMPOSE) run --rm --no-deps frontend bun install

typecheck: ## Проверить типы в backend и frontend
	$(COMPOSE) run --rm --no-deps backend bun run typecheck
	$(COMPOSE) run --rm --no-deps frontend bun run typecheck

db-generate: ## Сгенерировать Prisma Client
	$(COMPOSE) run --rm --no-deps backend bun run db:generate

db-migrate: ## Создать и применить миграцию (make db-migrate name=init)
	$(COMPOSE) run --rm backend bun run db:migrate --name $(name)

db-deploy: ## Применить существующие миграции
	$(COMPOSE) run --rm backend bun run db:deploy

db-shell: ## Открыть psql в контейнере postgres
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-app} -d $${POSTGRES_DB:-app}

backend-shell: ## Открыть shell в контейнере backend
	$(COMPOSE) exec backend sh

frontend-shell: ## Открыть shell в контейнере frontend
	$(COMPOSE) exec frontend sh

clean: ## Остановить и удалить контейнеры, тома и локальные образы
	$(COMPOSE) down -v --rmi local

reset-db: ## Удалить persistent-том postgres (destructive)
	$(COMPOSE) rm -sf postgres || true
	docker volume rm homework-review_postgres_data 2>/dev/null || true
