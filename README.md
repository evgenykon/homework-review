# Homework Review


## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | Nuxt 4, Vue 3, TypeScript, Tailwind CSS v4, SCSS (Sass). Только тёмная тема |
| Backend | Fastify 5, TypeScript, Prisma 7 (PostgreSQL), WebSocket (`@fastify/websocket`) |
| Runtime | Bun |
| Инфраструктура | Docker, Docker Compose, Make |

## Быстрый старт

```bash
cp .env.example .env   # опционально: есть значения по умолчанию
make up                # собрать dev-образы и запустить в фоне
```

Сервисы:

- Frontend — http://localhost:3000
- Backend — http://localhost:3001
- PostgreSQL — localhost:5432

Остановить: `make down`. Логи: `make logs`.

## Команды Make

| Команда | Описание |
| --- | --- |
| `make help` | Список команд |
| `make build` / `make build-dev` | Собрать dev-образы |
| `make dev` | Запустить dev-окружение с hot-reload (foreground) |
| `make up` | Собрать dev-образы и запустить в фоне |
| `make down` | Остановить контейнеры |
| `make restart` | Перезапустить dev-окружение |
| `make logs` | Логи всех сервисов |
| `make ps` | Статус сервисов |
| `make build-prod` | Собрать production-образы |
| `make prod` | Запустить production-окружение в фоне |
| `make install` | Установить зависимости внутри контейнеров |
| `make typecheck` | Проверить типы (backend + frontend) |
| `make db-generate` | Сгенерировать Prisma Client |
| `make db-migrate name=<name>` | Создать и применить миграцию |
| `make db-deploy` | Применить существующие миграции |
| `make db-shell` | Открыть `psql` |
| `make backend-shell` / `make frontend-shell` | Shell в контейнере |
| `make clean` | Удалить контейнеры, тома и локальные образы |
| `make reset-db` | Удалить persistent-том PostgreSQL (destructive) |

## Структура

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # модели Prisma
│   │   └── migrations/          # миграции
│   ├── prisma.config.ts         # конфиг Prisma 7
│   └── src/
│       ├── index.ts             # bootstrap и сборка зависимостей
│       ├── config/prisma.ts     # PrismaClient + driver adapter
│       ├── routes/              # декларация путей
│       ├── controllers/         # обработка HTTP-запросов
│       ├── handlers/            # обработка сообщений сокета
│       ├── services/            # бизнес-логика
│       └── repositories/        # доступ к данным (Prisma)
├── frontend/
│   ├── app.vue
│   ├── layouts/                 # макеты
│   ├── pages/                   # страницы (файловый роутинг)
│   ├── assets/css/
│   │   ├── tailwind.css         # Tailwind v4 + тема
│   │   └── main.scss            # SCSS-стили
│   └── server/routes/api/       # прокси /api/* → backend
├── docker-compose.yml           # dev + postgres (persistent volume)
├── docker-compose.prod.yml      # prod-override
└── Makefile
```

## Архитектура backend

Поток обработки запроса: **routes → controllers/handlers → services → repositories**.

- `routes` — только декларация путей и привязка к контроллерам/хендлерам;
- `controllers` — обработка HTTP-запросов;
- `handlers` — обработка сообщений WebSocket;
- `services` — бизнес-логика;
- `repositories` — доступ к данным через Prisma.

Зависимости собираются вручную в `src/index.ts`.

## API

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/health` | Проверка сервера и БД |
| `GET` | `/api/messages` | Последние сообщения |
| `POST` | `/api/messages` | Создать сообщение `{ "body": "..." }` |
| `WS` | `/ws?sessionId=<id>` | Чат комнаты: отправка `{ "body": "..." }`, приём `{ "type": "message", "message": {...} }` |
| `GET` | `/api/auth/yandex` | Начать OAuth-вход через Яндекс (`?role=parent\|child`, `?parentId=<id>`) |
| `GET` | `/api/auth/yandex/callback` | Callback Яндекс OAuth (redirect-флоу) |
| `POST` | `/api/auth/yandex/token` | Вход по токену из официальной кнопки Яндекс ID `{ "token": "..." }` |
| `GET` | `/api/auth/me` | Текущий пользователь (по сессии) |
| `POST` | `/api/auth/logout` | Завершить сессию |
| `POST` | `/api/invites` | Создать инвайт для ребёнка (только роль `parent`) |
| `GET` | `/api/children` | Список детей текущего родителя |
| `GET` | `/api/children/:id` | Ребёнок по id (только свой) |
| `GET` | `/api/children/:id/sessions` | Комнаты чата ребёнка (только родитель) |
| `POST` | `/api/children/:id/sessions` | Создать комнату `{ "name": "..." }` |
| `GET` | `/api/sessions` | Комнаты текущего пользователя |
| `GET` | `/api/sessions/:id/messages` | Сообщения комнаты |

HTTP-запросы из браузера идут через прокси Nuxt (`/api/*` → `backend:3001`). WebSocket подключается напрямую к backend.

## Аутентификация

Вход возможен **только через OAuth** (Яндекс). Паролей нет.

На странице `/login` используется **официальная кнопка Яндекс ID** (SDK `YaAuthSuggest`, «мгновенная авторизация»). Она возвращает OAuth-токен, который фронтенд отправляет в `POST /api/auth/yandex/token`; backend проверяет токен и создаёт сессию. Если `YANDEX_CLIENT_ID` не задан или SDK не загрузился, показывается запасная кнопка-ссылка на redirect-флоу `/api/auth/yandex`.

Redirect-флоу (тоже поддерживается):

- `GET /api/auth/yandex` формирует `state` (с ролью и `parentId`), кладёт его в httpOnly-cookie `oauth_state` и редиректит в Яндекс.
- Яндекс возвращает код на `YANDEX_REDIRECT_URI`; backend меняет код на токен, забирает профиль (имя, аватар, email).
- Пользователь ищется по привязке OAuth (`oauth_accounts`); если привязки нет — создаётся новый `users` с ролью из `state` (по умолчанию `parent`).
- Создаётся запись в `sessions`, а её токен кладётся в httpOnly-cookie `sid` (SameSite=Lax).
- Для роли `child` можно передать `parentId` — если это существующий пользователь с ролью `parent`, он проставится в `users.parent_id`.

Роли: `parent` и `child` (enum `UserType`). Таблицы: `users`, `oauth_accounts` (привязка OAuth-аккаунтов), `sessions`.

### Инвайты

Родитель на `/dashboard` нажимает «Сгенерировать инвайт» → `POST /api/invites` создаёт запись в `invites` и возвращает ссылку вида `http://localhost:3000/login?invite=<token>`. Ребёнок открывает ссылку, входит через Яндекс, и при входе backend привязывает его к родителю (`users.parent_id`, роль `child`), после чего инвайт помечается использованным. Инвайт одноразовый и истекает через `INVITE_TTL_DAYS`.

### Дети и комнаты

На `/dashboard` родитель видит список своих детей (`GET /api/children`). Клик по ребёнку ведёт на `/children/:id`, где родитель может создать комнату чата (кнопка «Создать чат» → модалка с названием → `POST /api/children/:id/sessions`). Созданная комната сразу появляется и в дашборде ребёнка (`GET /api/sessions`).

Страница комнаты `/sessions/:id` подключается к WebSocket `/ws?sessionId=<id>` (авторизация по cookie `sid`). Отправленные сообщения сохраняются в `messages` с привязкой к сессии и отправителю и рассылаются всем участникам комнаты.

Таблицы: `chat_sessions` (комната: `name`, `child_id`, `parent_id`), `messages` (`session_id`, `sender_id`, `body`).

### Регистрация приложения в Яндексе

В консоли Яндекс OAuth (https://oauth.yandex.ru/) при создании приложения:

- Платформа: **Веб-сервисы**.
- **Redirect URI** (оба адреса):
  - `http://localhost:3000/api/auth/yandex/callback` — redirect-флоу;
  - `http://localhost:3000/suggest/token` — вспомогательная страница официальной кнопки.
  - Для прода — те же пути на `https://<домен>`.
- **Suggest Hostname**: `http://localhost:3000` (нужен для официальной кнопки; для прода — `https://<домен>`).
- Права доступа (scope): `login:info`, `login:email`, `login:avatar`, `login:birthday`.

Redirect URI сверяется точно по схеме, хосту, порту и пути; на одно приложение допускается до 5 URI.

## Переменные окружения

Корневой `.env` (см. `.env.example`):

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `POSTGRES_USER` | `app` | Пользователь БД |
| `POSTGRES_PASSWORD` | `app` | Пароль БД |
| `POSTGRES_DB` | `app` | Имя БД |
| `POSTGRES_PORT` | `5432` | Порт PostgreSQL на хосте |
| `BACKEND_PORT` | `3001` | Порт backend на хосте |
| `FRONTEND_PORT` | `3000` | Порт frontend на хосте |
| `APP_URL` | `http://localhost:3000` | Куда редиректить после входа |
| `SESSION_TTL_DAYS` | `30` | Время жизни сессии |
| `INVITE_TTL_DAYS` | `7` | Время жизни инвайта |
| `COOKIE_SECURE` | `false` | Флаг `Secure` у cookie (включить за HTTPS) |
| `YANDEX_CLIENT_ID` | — | Client ID приложения Яндекса |
| `YANDEX_CLIENT_SECRET` | — | Client Secret приложения Яндекса |
| `YANDEX_REDIRECT_URI` | `http://localhost:3000/api/auth/yandex/callback` | Redirect URI (указать в консоли Яндекса) |

Backend: `DATABASE_URL`, `PORT`, `HOST`. Frontend: `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_WS_BASE`.

## Данные и миграции

- Данные PostgreSQL хранятся в persistent-томе `homework-review_postgres_data` и переживают перезапуск контейнеров.
- Сбросить БД: `make reset-db`.
- Новая миграция: изменить `backend/prisma/schema.prisma` и выполнить `make db-migrate name=<name>`.
- При старте backend автоматически применяет миграции (`prisma migrate deploy`).
