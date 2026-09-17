# AGENTS.md

Инструкции для AI-агентов и контрибьюторов, работающих с этим репозиторием.

## Главное правило: только контейнеры

**Запрещено запускать `npm`, `npx`, `pnpm`, `yarn`, `bun`, `node` и другие Node-инструменты на хосте.** Установка зависимостей, сборка, типы, миграции и любые Node-операции выполняются **только внутри Docker-контейнера с примонтированным каталогом проекта**.

Если нужна разовая команда — используй контейнер с монтированием:

```bash
docker run --rm -v "$PWD/backend:/app" -w /app oven/bun:1 bun install
docker run --rm -v "$PWD/frontend:/app" -w /app oven/bun:1 bun run build
```

Предпочтительно использовать готовые make-таргеты (они делают то же самое).

## Стек

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Tailwind CSS v4, SCSS. Только тёмная тема.
- **Backend**: Fastify 5, TypeScript, Prisma 7 + PostgreSQL, WebSocket (`@fastify/websocket`).
- **Runtime**: Bun. **Инфраструктура**: Docker Compose + Make.

## Основные команды

| Задача | Команда |
| --- | --- |
| Собрать dev-образы | `make build-dev` (алиас `make build`) |
| Запустить dev (hot-reload, foreground) | `make dev` |
| Запустить dev в фоне | `make up` |
| Остановить | `make down` |
| Логи | `make logs` |
| Установить зависимости в контейнерах | `make install` |
| Проверить типы (backend + frontend) | `make typecheck` |
| Сборка production-образов | `make build-prod` |
| Миграции | `make db-generate`, `make db-migrate name=<name>`, `make db-deploy` |

Проверка изменений: `make typecheck` и, для frontend, `make build-prod` (или `bun run build` в контейнере). Перед завершением задачи убедись, что сборка и типы проходят.

## Backend: архитектура и конвенции

Поток: **routes → controllers/handlers → services → repositories**.

- `src/routes/*.routes.ts` — класс с методом `register(app)`, только декларация путей и привязка обработчиков. Логики здесь нет.
- `src/controllers/*.controller.ts` — обработка HTTP-запросов (валидация входных данных, формирование ответа), вызов сервиса.
- `src/handlers/*.handler.ts` — обработка событий WebSocket (подключение, сообщение, закрытие).
- `src/services/*.service.ts` — бизнес-логика, оркестрация репозиториев.
- `src/repositories/*.repository.ts` — доступ к данным, только Prisma-запросы.
- `src/config/prisma.ts` — единственный `PrismaClient` (с `@prisma/adapter-pg`).

Правила:

- Новую сущность добавляй во все слои: repository → service → controller/handler → route.
- Не обращайся к Prisma из контроллеров и сервисов напрямую — только через репозиторий.
- Зависимости собираются вручную в `src/index.ts` (composition root).
- Prisma-клиент генерируется в `backend/generated/prisma` (в git не хранится).
- При изменении `prisma/schema.prisma` создай миграцию: `make db-migrate name=<name>`.
- Prisma 7 использует ESM-клиент и driver adapter (`@prisma/adapter-pg`); `prisma.config.ts` читает `DATABASE_URL`.

### Аутентификация

- Вход только через OAuth (Яндекс). Паролей нет. Провайдер инкапсулирован в `src/services/yandex-oauth.service.ts`.
- Поддерживаются два флоу: redirect (`/auth/yandex` → `/auth/yandex/callback`) и токен из официальной кнопки Яндекс ID (`POST /auth/yandex/token`).
- `src/services/auth.service.ts` — вход (поиск/создание `users` + привязка в `oauth_accounts`), создание/проверка/удаление сессий.
- Сессии хранятся в таблице `sessions`; токен передаётся в httpOnly-cookie `sid`. Cookie ставится/чистится в `auth.controller.ts`.
- Роли: enum `UserType` (`parent`, `child`); связь родитель→ребёнок через `users.parent_id` (self-relation).
- Инвайты: `src/services/invite.service.ts` + `invite.repository.ts`; родитель создаёт ссылку (`POST /invites`), при входе ребёнка инвайт привязывает его к родителю и помечается использованным (таблица `invites`).
- `state` OAuth кладётся в httpOnly-cookie `oauth_state` и проверяется в callback (CSRF).
- Новые эндпоинты добавляй в `src/routes/auth.routes.ts` → `AuthController` → `AuthService`.
- OAuth-редиректы идут через Nuxt-прокси, поэтому `server/routes/api/[...path].ts` пробрасывает cookie, `Set-Cookie` и `Location`.

## Frontend: конвенции

- Nuxt 4, файловый роутинг (`pages/`), макеты в `layouts/`.
- Стили разделены: `assets/css/tailwind.css` (Tailwind v4, тема через `@theme`) и `assets/css/main.scss` (SCSS: переменные, миксины, вложенность).
- Тема только тёмная — светлую тему и переключатель не добавлять.
- Обращения к API из браузера идут через прокси `server/routes/api/[...path].ts` (`/api/*` → `backend:3001`).
- WebSocket подключается напрямую, базовый адрес — `runtimeConfig.public.wsBase`.
- Каталог `components/` пока отсутствует. Авторизация: `composables/useAuth.ts` (состояние текущего юзера) и `middleware/auth.ts` (редиректы: `/` → `/dashboard` или `/login`).

## Окружение

- Порты: frontend `3000`, backend `3001`, PostgreSQL `5432`.
- Данные PostgreSQL — в persistent-томе `homework-review_postgres_data` (переживает `down`/`up`). Удаление: `make reset-db`.
- Env: корневой `.env` (см. `.env.example`), backend `DATABASE_URL`/`PORT`/`HOST`, frontend `NUXT_PUBLIC_API_BASE`/`NUXT_PUBLIC_WS_BASE`.
- OAuth (Яндекс): `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI`, `APP_URL`, `SESSION_TTL_DAYS`, `INVITE_TTL_DAYS`, `COOKIE_SECURE`. Frontend получает `client_id` через `NUXT_PUBLIC_YANDEX_CLIENT_ID` (прокидывается из `YANDEX_CLIENT_ID`).

## Git

- Не коммить `node_modules/`, `.nuxt/`, `.output/`, `generated/`, `.env`.
- Сообщения коммитов — Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:` и т.д.).
- Коммитить только по явному запросу.
