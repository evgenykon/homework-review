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
| `WS` | `/ws?sessionId=<id>` | Чат и вайтборд комнаты: `message`, `page:add`, `page:remove`, `stroke:add`, `stroke:remove`, `session:update`, `session:deleted`, `session:books:changed` |
| `WS` | `/ws` | Персональный канал пользователя (дашборд, архив, библиотека): `sessions:changed`, `library:changed`, `notification` |
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
| `GET` | `/api/sessions` | Комнаты текущего пользователя (с `unreadCount`) |
| `POST` | `/api/sessions/:id/read` | Отметить комнату прочитанной |
| `GET` | `/api/sessions/:id` | Комната по id |
| `GET` | `/api/sessions/:id/messages` | Сообщения комнаты |
| `POST` | `/api/sessions/:id/review` | Ревью комнаты (только родитель): `{ "result": "REVIEWED" \| "APPROVED" }` |
| `GET` | `/api/sessions/archive` | Архивные комнаты родителя |
| `POST` | `/api/sessions/:id/archive` | Архивировать комнату (только родитель) |
| `POST` | `/api/sessions/:id/restore` | Восстановить комнату из архива |
| `DELETE` | `/api/sessions/:id` | Удалить комнату навсегда (сообщения, рисунки, файлы) |
| `GET` | `/api/books` | Книги библиотеки (общие для родителя и его детей) |
| `POST` | `/api/books` | Добавить книгу (multipart: `title`, `file`) |
| `GET` | `/api/books/:id/file` | Файл книги |
| `DELETE` | `/api/books/:id` | Удалить книгу |
| `GET` | `/api/sessions/:id/books` | Книги, привязанные к комнате |
| `PUT` | `/api/sessions/:id/books` | Задать список книг комнаты `{ "bookIds": [...] }` |
| `POST` | `/api/sessions/:id/pages` | Загрузить изображение в комнату (multipart, поле `file`) |
| `GET` | `/api/sessions/:id/pages` | Страницы комнаты с рисунками |
| `DELETE` | `/api/pages/:pageId` | Удалить страницу (вместе с рисунками и файлом) |
| `POST` | `/api/pages/:pageId/strokes` | Добавить штрих `{ "data": { ... } }` |
| `GET` | `/api/pages/:pageId/image` | Изображение страницы |

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

Таблицы: `chat_sessions` (комната: `name`, `status`, `child_id`, `parent_id`), `messages` (`session_id`, `sender_id`, `body`, `system`). Технические сообщения (добавление изображения, итог ревью) создаются с `system = true` и в чате выводятся без пузыря.

### Вайтборд

Страница `/sessions/:id` — вайтборд: слева область с фотографиями и рисованием, справа (на десктопе) чат; на планшете и мобильных чат открывается кнопкой снизу.

- Фото загружаются файлом, снимком с камеры (`capture`) или drag&drop; при добавлении появляются миниатюры-страницы внизу, переключение по клику.
- Рисование — отдельным слоем поверх фото (canvas), штрихи хранятся в координатах изображения.
- Зум/панорама: колесо/ pinch и перетаскивание.
- Изображения сохраняются на диск в `UPLOAD_DIR` (в dev — каталог `uploads/` в корне репозитория, примонтирован в контейнер, в `.gitignore`).
- Синхронизация: после завершения линии штрих сохраняется (`POST /pages/:id/strokes`) и рассылается в комнату событием `stroke:add`; добавление/удаление страниц — `page:add`/`page:remove`.

Таблицы: `room_pages` (`session_id`, `position`, `file_name`, `mime_type`), `strokes` (`page_id`, `data` JSON). При удалении страницы рисунки удаляются каскадом, файл — с диска.

### Ревью

У комнаты есть статус (enum `ReviewStatus`): `PENDING` (по умолчанию), `REVIEWED`, `APPROVED`.

- Родитель на странице комнаты нажимает **Review** → модалка с кнопками «Есть замечания» (`REVIEWED`) и «Одобрено» (`APPROVED`) → `POST /api/sessions/:id/review`.
- После ревью статус меняется, в чат пишется сообщение вида `<имя> закончил ревью, результат: <результат>`, а всем участникам уходит WS-событие `session:update`.
- Когда ребёнок загружает новое изображение, статус сбрасывается на `PENDING`.
- Текущий статус показывается бейджем в шапке комнаты.

### Архив и удаление

В комнате у родителя есть кнопка **Удалить** с модалкой:

- **Архивировать** — `chat_sessions.archived_at` заполняется, комната пропадает из списков (дашборд, комнаты ребёнка), но появляется в архиве. На дашборде показывается карточка **«Архив комнат»** со ссылкой на `/archive`; там комнату можно открыть и восстановить (`POST /sessions/:id/restore`).
- **Удалить навсегда** — `DELETE /sessions/:id`: удаляются комната, сообщения, страницы и штрихи (каскадом), а файлы изображений стираются с диска. Подключённым клиентам уходит WS-событие `session:deleted`.

### Непрочитанные сообщения

`GET /api/sessions` возвращает комнаты с полем `unreadCount` — количество сообщений не от текущего пользователя после последнего прочтения. При открытии комнаты фронт вызывает `POST /sessions/:id/read`; при новом сообщении участникам уходит WS `sessions:changed`, и дашборд обновляет счётчики. Прогресс чтения хранится в `session_reads` (`user_id`, `session_id`, `last_read_message_id`).

### Библиотека

Раздел `/library` — общая библиотека учебников для родителя и его детей (владелец — родитель: книга, загруженная ребёнком, попадает в библиотеку его родителя).

- На дашборде карточка **«Библиотека (N)»** со счётчиком книг.
- «Добавить» открывает модалку: название + файл (выбор файла или drag&drop). Загрузка — `POST /api/books` (multipart).
- Книгу можно открыть (`GET /api/books/:id/file`, отдаётся inline — браузер показывает PDF) и удалить (`DELETE /api/books/:id`, файл стирается с диска).
- Изменения библиотеки рассылаются связанным пользователям WS-событием `library:changed` (через персональный канал).

Таблица: `books` (`owner_id`, `title`, `file_name`, `mime_type`, `size`).

В комнате над чатом есть блок **«Книги»**: привязанные к комнате книги (клик по названию открывает тот же вьюер) и кнопка **«+ Добавить»** — открывает список библиотеки с чекбоксами; отмеченные книги сохраняются в комнате (`PUT /sessions/:id/books`) и рассылаются участникам событием `session:books:changed`. Связь хранится в `session_books` (`session_id`, `book_id`).

### Уведомления

В браузере можно включить уведомления (кнопка на дашборде, Notification API). На события, затрагивающие второго участника, backend шлёт в персональный канал событие `notification` с `kind`: `message` (новое сообщение), `status` (итог ревью), `image` (добавлено изображение). Фронт показывает уведомление только когда вкладка не активна (`document.hidden`), с дебаунсом — не чаще одного на `kind:sessionId` раз в 3 секунды.

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
| `UPLOAD_DIR` | `/data/uploads` | Каталог для загруженных изображений (в контейнере) |
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

## Деплой

Прод-стек (`docker-compose.yml` + `docker-compose.prod.yml`) запускается на сервере из готовых образов:

- **Caddy** — единственная публичная точка (порты 80/443), автоматически получает сертификат Let's Encrypt для `DOMAIN` и проксирует: `/api/*` → backend, `/ws` → backend, остальное → frontend.
- **backend** и **frontend** — образы из GHCR, порты наружу не публикуются.
- **postgres** — только внутри сети compose, данные в persistent-томе.

Пайплайн GitHub Actions (`.github/workflows/build.yml`):
1. `build` — собирает образы backend/frontend (target `production`) и пушит в `ghcr.io/<owner>/<repo>-{backend,frontend}`.
2. `deploy` — после `build`: раскладывает `docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile` на сервер, формирует `.env` из Variables/Secrets, логинится в GHCR (если задан токен) и выполняет `docker compose pull && up -d`.

Сертификат выпускается автоматически при первом старте Caddy: нужны DNS-запись домена на сервер и открытые порты 80/443.

### GitHub: Secrets

`SSH_PRIVATE_KEY`, `POSTGRES_PASSWORD`, `YANDEX_CLIENT_SECRET`, `GHCR_TOKEN`.

### GitHub: Variables

`DOMAIN`, `DEPLOY_HOST`, `DEPLOY_USER`, `GHCR_USER`, `YANDEX_CLIENT_ID`, `YANDEX_REDIRECT_URI`; опционально `POSTGRES_USER`, `POSTGRES_DB`, `BACKEND_PORT`, `FRONTEND_PORT`, `APP_URL`, `PUBLIC_BACKEND_ORIGIN`, `PUBLIC_WS_BASE`, `SESSION_TTL_DAYS`, `INVITE_TTL_DAYS`, `COOKIE_SECURE`.

### Яндекс OAuth для прода

В консоли Яндекс OAuth добавить Redirect URI `https://<DOMAIN>/api/auth/yandex/callback` и `https://<DOMAIN>/suggest/token`, Suggest Hostname — `https://<DOMAIN>`.
