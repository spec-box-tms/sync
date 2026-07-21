# Backend `serve` Implementation Plan

> **Для агентных исполнителей:** выполнять задачи последовательно через TDD; отмечать чекбоксы по факту. `specs/backend/*.spec.yml` — не справочный материал: это план тестов. Каждый `assert` становится именованным тестом с дословным названием из YAML, а задача считается готовой только после прохождения всех своих `assert`.

**Цель:** добавить в CLI команду `spec-box serve`, запускающую loopback-only Express-сервер с JSON API, SSE и единым пересчитываемым снимком рабочей копии.

**Архитектура:** CLI запускает `src/lib/serve`, который переиспользует загрузчики конфигурации/YAML, валидатор и Jest/JUnit matcher-ы. Один сервис хранит `ProjectSnapshot`, полностью пересчитывает его при старте, записи и внешних изменениях; Express только переводит HTTP-запросы в операции этого сервиса. Backend — часть npm-пакета CLI; отдельный сервер, БД и внешний API не появляются.

**Стек:** Node.js 20, TypeScript 5, Express, `node:test` со встроенным JUnit reporter, существующие `fast-glob`, `yaml`, `io-ts`, `fs-extra`.

## Глобальные ограничения

- Вся реализация backend — в `src/lib/serve/*`; CLI-обвязка — только в `src/commands/serve.ts` и регистрации в `src/cli.ts`.
- Сервер слушает только `127.0.0.1` и `::1`; он не вызывает `api.host`, не запускает тесты и не меняет `.tms.json`, мета-файл или отчёты.
- API строгий: неизвестные поля дают `400`; `POST` принимает только `filePath`, `code`, `title`; `PUT` игнорирует `filePath` и `isAutomated`.
- Ошибка YAML, мета-файла или отчёта становится диагностикой и не скрывает корректные данные. Некорректный `.tms.json` после старта даёт снимок только с ревизией и диагностикой.
- Сохранение использует MD5 исходных байтов YAML; конфликт возвращает `409` без тела.
- `npm run test:serve` записывает JUnit-отчёт в `test-results/junit.xml` — путь из `.tms.json`. Имя каждого теста строго равно `featureCode featureTitle groupTitle assertionTitle`; это порядок `JUnit.keys` в `.tms.json`.
- В MVP нет инкрементального пересчёта, отдельного хранилища, очереди, WebSocket, запуска тестов, Git diff и переписывания ссылок при смене кода.

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `package.json`, `package-lock.json` | Express, JUnit-экспорт и команды проверки backend. |
| `src/commands/serve.ts`, `src/cli.ts` | Команда `spec-box serve`, параметры порта и запуск. |
| `src/lib/config/index.ts`, `src/lib/validators/validator.ts` | Узкое расширение существующего загрузочного потока: tolerant-режим для снимка и доступ к нормализованным ошибкам без `console.log`. |
| `src/lib/serve/models.ts` | Контракт API, `io-ts`-декодеры строгих write-запросов, модели диагностик и снимка. |
| `src/lib/serve/snapshot.ts` | Полный пересчёт, маппинг диагностик, покрытия, областей хранения, деревьев и графа. |
| `src/lib/serve/features.ts` | Чтение модели фичи, MD5, проверка/запись `POST` и `PUT`. |
| `src/lib/serve/git.ts` | Только чтение локальной Git-истории и YAML из коммита через `execFile`. |
| `src/lib/serve/server.ts` | Express-маршруты, SSE, watcher и debounce; раздача будущего static Angular build без backend-зависимости от Angular. |
| `test/lib/serve/spec-name.ts` | Формирует единственное допустимое имя теста по `JUnit.keys` из `.tms.json`. |
| `test/lib/serve/*.test.ts` | HTTP-интеграционные тесты API и минимальные unit-тесты derived-данных на временной рабочей копии; экспортируются в JUnit. |

## Общий TDD-порядок

Для каждой задачи ниже:

1. Выписать её `assert` из указанного `spec.yml` в тесты. Вызывать `specTest(featureCode, featureTitle, groupTitle, assertionTitle, fn)`, чтобы `testcase.name` в JUnit был точным ключом из `.tms.json`, а не только текстом assertion.
2. Запустить только новый файл: `node --test -r ts-node/register test/lib/serve/<file>.test.ts`; убедиться, что тест красный по отсутствующему поведению.
3. Реализовать минимальный код в названных файлах, не дублируя правила из `config`, `yaml`, `validators` и `test-matcher`.
4. Повторить команду до PASS, затем `npm run build` и `npm run test:serve`.
5. Сделать один тематический коммит.

### Задача 1: каркас CLI, Express и тестового контура

**Покрывает:** `specs/backend/00-serve-backend.spec.yml` (границы и запуск).

**Файлы:**

- Изменить: `package.json`, `package-lock.json`, `src/cli.ts`.
- Создать: `src/commands/serve.ts`, `src/lib/serve/server.ts`, `src/lib/serve/models.ts`, `test/lib/serve/server.test.ts`.

- [x] Добавить runtime-зависимость `express` и `@types/express`; добавить `test:serve`, который создаёт `test-results/` и запускает `node --test -r ts-node/register --test-reporter=junit test/lib/serve/*.test.ts > test-results/junit.xml`. Не добавлять Jest, Supertest, JUnit-пакет или watcher-пакет.
- [x] Создать `test/lib/serve/spec-name.ts` с `specTest(code, feature, group, assertion, fn)`: он вызывает `node:test` с именем `[code, feature, group, assertion].join(' ')`. Не добавлять вложенные suites: в `junit.xml` нужен точный `testcase.name`, а не составленное runner-ом имя.
- [x] Написать первый тест команды через `specTest('serve-project-get', 'GET /api/project', 'Успешный ответ', 'GET /api/project возвращает текущий ProjectSnapshot с HTTP 200 и JSON в кодировке UTF-8', fn)`: сервер с фиктивным сервисом отвечает JSON UTF-8; процесс принимает `serve --port 0` и выводит фактический loopback URL.
- [x] Зарегистрировать `cmdServe` в `src/cli.ts`; параметр `--port` — необязательное целое `0..65535`, по умолчанию `0`.
- [x] Реализовать `startServer({ projectRoot, port })`: Express с `express.json()`, HTTP server на `127.0.0.1`, лог полного URL после `listen`. Держать экземпляр сервера закрываемым для тестов.
- [x] Добавить минимальную static-раздачу собранного UI, только если каталог build существует; отсутствие UI не мешает API. Не создавать Angular-код в этой задаче.
- [x] Запустить `npm run build` и `npm run test:serve`; проверить, что создан `test-results/junit.xml` и его `<testcase name>` равен полному ключу из предыдущего шага. Commit `feat: add serve command skeleton`.

### Задача 2: единый снимок проекта и read-only `GET /api/project`

**Покрывает:** все `assert` из `specs/backend/10-project-snapshot-get.spec.yml`.

**Файлы:**

- Изменить: `src/lib/config/index.ts`, `src/lib/validators/validator.ts`, `src/lib/serve/models.ts`, `src/lib/serve/server.ts`.
- Создать: `src/lib/serve/snapshot.ts`, `test/lib/serve/project.test.ts`, `test/lib/serve/fixtures.ts`.

- [x] Создать временную рабочую копию в test helper: `.tms.json`, мета-файл, корректная и ошибочная YAML-спецификации, минимальные Jest/JUnit отчёты. Каждый тест создаёт и удаляет собственный каталог.
- [x] Сделать красные тесты через `specTest` для каждого `assert`: полный контракт снимка, увеличение `revision`, изоляция ошибок YAML/мета/отчёта, ошибка нового `.tms.json`, покрытие, граф и неразрешённые ссылки.
- [x] Добавить к существующему `Validator` read-only getter полного списка ошибок; добавить tolerant-загрузку только для `serve`, которая собирает loader diagnostics вместо печати и не меняет поведение текущих `sync`/`validate` команд.
- [x] Реализовать `ProjectSnapshotService.refresh()`: заново прочитать текущую конфигурацию, YAML, мета-файл и настроенные отчёты; вызвать существующие `loadProject`, `loadJestReport`, `loadJUnitReport`, `applyTestReport` там, где они применимы. При невалидном текущем `.tms.json` сохранить только `{ revision, diagnostics }`.
- [x] В одном месте преобразовать доменную модель и ошибки валидатора в API-модели: diagnostics, `coverage`, существующие storage directories, feature trees с `UNDEFINED`/`Не задано`, dependency graph. `GET /api/project` возвращает текущий снимок с `200`.
- [x] Проверить `npm run build` и `npm run test:serve`; commit `feat: add project snapshot endpoint`.

### Задача 3: текущая фича и строгая запись YAML

**Покрывает:** все `assert` из `specs/backend/20-feature-current-get.spec.yml`, `40-feature-create-post.spec.yml` и `50-feature-update-put.spec.yml`.

**Файлы:**

- Изменить: `src/lib/serve/models.ts`, `src/lib/serve/server.ts`, `src/lib/serve/snapshot.ts`.
- Создать: `src/lib/serve/features.ts`, `test/lib/serve/features.test.ts`.

- [x] Написать красные HTTP-тесты через `specTest` для каждого `assert` трёх спецификаций: текущая модель фичи и MD5, `404`; успешный и отклонённый `POST`; успешный, конфликтный, некорректный и отсутствующий `PUT`.
- [x] В `models.ts` описать `FeatureResponse`, `CreateFeatureRequest`, `UpdateFeatureRequest`, `ErrorResponse` и строгие `io-ts`-декодеры. Декодер `PUT` разрешает только документированные поля; контроллер удаляет разрешённые, но вычисляемые `filePath`/`isAutomated` до записи.
- [x] В `features.ts` реализовать преобразование между существующим `YamlFile`/доменной моделью и API-моделью; для текущего файла вычислять `createHash('md5')` от неизменённых байтов. Для снимка Git `optimisticLock` не добавлять.
- [x] Реализовать `POST`: до любого `mkdir` проверить путь относительно project root, соответствие положительному `yml.files`, исключения, существование файла, уникальность code и непустой title. Только после успешной проверки создать каталоги и записать минимальный YAML с пользовательским именем и суффиксом.
- [x] Реализовать `PUT`: найти фичу по текущему code, сверить lock с bytes на диске, проверить строгую модель, уникальность нового code, названия групп и мета-атрибуты. При успехе перезаписать только этот YAML, сохранив его путь; не переписывать ссылки или test keys. При `400` не записывать файл, при несовпадении вернуть пустой `409`.
- [x] После каждого успешного `POST`/`PUT` вызвать `refresh()` и вернуть новый snapshot (`201`/`200`); неразрешённые ссылки и повторные asserts остаются в YAML и приходят diagnostics.
- [x] Проверить `npm run build` и `npm run test:serve`; commit `feat: add feature read and write API`.

### Задача 4: Git-история и снимки ревизий

**Покрывает:** все `assert` из `specs/backend/30-feature-revision-get.spec.yml` и `60-feature-history-get.spec.yml`.

**Файлы:**

- Изменить: `src/lib/serve/server.ts`.
- Создать: `src/lib/serve/git.ts`, `test/lib/serve/git.test.ts`.

- [x] Подготовить временный Git-репозиторий в тесте с двумя коммитами YAML-фичи; отдельным тестом подменить Git adapter ошибкой/пустым результатом.
- [x] Написать красные тесты через `specTest` для списка истории, ISO-даты с timezone, `[]` при неотслеживаемом/недоступном Git, revision snapshot без lock и всех вариантов `404`.
- [x] Реализовать adapter на `execFile('git', ...)`, не на shell: `log --format` для истории и `show <commit>:<path>` для bytes. Проверить, что commit есть в истории именно выбранного файла до чтения файла.
- [x] Распарсить YAML из `git show` существующим decoder и отдать ту же feature-модель без `optimisticLock`; Git failures локально преобразовать в `[]` для history и `404` для revision, не останавливая сервер.
- [x] Подключить `GET /api/features/:code/history` и `GET /api/features/:code?revision=:commit`; проверить `npm run build` и `npm run test:serve`; commit `feat: add feature Git history API`.

### Задача 5: watcher и SSE

**Покрывает:** все `assert` из `specs/backend/70-events-get.spec.yml`, а также требование пересчёта из `10-project-snapshot-get.spec.yml`.

**Файлы:**

- Изменить: `src/lib/serve/server.ts`, `test/lib/serve/server.test.ts`.

- [x] Написать красные тесты SSE через `specTest`: content type, единственное `project-updated`, payload только `{ revision }`, один refresh/event для серии быстрых изменений. Тест читать поток через `fetch()` и `ReadableStream`, затем закрывать сервер и watcher.
- [x] На нативном `fs.watch` наблюдать `.tms.json`, meta-файл, статические корни положительных `yml.files` и настроенные файлы отчётов. Изменённый набор путей брать из последней корректной конфигурации, чтобы ошибочный новый `.tms.json` всё ещё давал diagnostic snapshot.
- [x] Объединять события одним `setTimeout` debounce; при срабатывании один раз вызвать `refresh()`, увеличить revision и отправить всем открытым SSE-клиентам `event: project-updated` и JSON только с revision.
- [x] Освобождать клиентов по `req.close`, watcher и таймер при закрытии HTTP-server. Не добавлять WebSocket/chokidar.
- [x] Проверить `npm run build` и `npm run test:serve`; commit `feat: notify serve clients of project updates`.

### Задача 6: сквозная проверка и документация CLI

**Покрывает:** `specs/backend/00-serve-backend.spec.yml` и все backend-спецификации как регрессионный набор.

**Файлы:**

- Изменить: `README.md`, при необходимости `docs/backend.md` только если контракт реализации потребовал уточнения.
- Проверить: `package.json`, `test/lib/serve/*.test.ts`.

- [x] Добавить в README один пример `spec-box serve --port 0`, пояснение про loopback URL и отсутствие обращений к `api.host`/запуска тестов.
- [x] Сверить каждый `assert` из семи route-specs с одним `specTest`: ключ — `code` и `feature` верхнего YAML, имя группы и assert из `specs-unit`, соединённые пробелом в порядке `JUnit.keys`. Дописать только отсутствующие тесты.
- [x] Выполнить чистые проверки: `npm run build`, `npm run test:serve`; открыть `test-results/junit.xml` и сверить все `<testcase name>` с ключами, рассчитанными по `.tms.json`. Затем ручной smoke-test во временной копии: `node dist/cli.js serve --config <temp> --port 0`, `curl` к `/api/project`, проверить, что URL loopback и процесс не обращается к `api.host`.
- [x] Commit `docs: document local serve command`.

## Порядок поставки

1. Задачи 1–2 дают работающий read-only backend и позволяют frontend начать интеграцию с snapshot API.
2. Задача 3 добавляет создание и редактирование без расширения модели YAML.
3. Задачи 4–5 независимы после задачи 2, но обе используют готовый snapshot service.
4. Задача 6 — обязательный финальный regression gate.

## Не делать сейчас

- Не создавать отдельный backend-пакет, БД, очередь, WebSocket, REST-клиент или слой repository: для одного локального CLI-процесса это не даёт ценности.
- Не добавлять Supertest, Jest, JUnit-пакет или chokidar: Express проверяется нативным `fetch`, тесты и JUnit XML — `node:test`, наблюдение — `fs.watch`.
- Не реализовывать Angular SPA, Git diff или запуск тестов: это соседние задачи, контракт backend уже их покрывает.
