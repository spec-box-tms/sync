# SpecBox Sync: доменные модели и API `serve`

Этот документ задаёт JSON-контракт между Angular SPA и локальной командой
`spec-box serve`. Он дополняет [backend.md](backend.md): тот описывает
поведение backend, этот — форму передаваемых данных. API внутренний, не
версируется и доступен только через loopback.

Все пути файлов в JSON-ответах и запросе создания относительны к каталогу
проекта и используют `/` как разделитель. YAML для обновления передаётся
непрозрачным телом и не имеет ограничений JSON-модели.

## Общие типы

```ts
type Severity = 'info' | 'warning' | 'error';

interface ProjectInfo {
  title?: string;
  description?: string;
  repository?: string;
}

interface AttributeValue {
  code: string;
  title: string;
}

interface Attribute {
  code: string;
  title: string;
  values: AttributeValue[];
}

interface TreeDefinition {
  code: string;
  title: string;
  groupBy: string[];
}
```

`code` фичи, атрибута и значения атрибута начинается с латинской буквы и
содержит только латинские буквы, цифры, `-` и `_`.

## Фича

### Модель в снимке проекта

```ts
interface Assertion {
  title: string;
  description?: string;
  isAutomated: boolean;
}

interface AssertionGroup {
  title: string;
  assertions: Assertion[];
}

interface Feature {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: AssertionGroup[];
  filePath: string;
}
```

`isAutomated` вычисляется по загруженным Jest/JUnit-отчётам и не означает, что
тест был успешно выполнен.

Пустые атрибуты и группы возвращаются как `{}` и `[]`; необязательное
`description` отсутствует, если в YAML его нет.

### Создание фичи

При создании разрешены только путь, код и название:

```ts
interface CreateFeatureRequest {
  filePath: string;
  code: string;
  title: string;
}
```

Существующая фича редактируется её YAML-телом, а не JSON-моделью. Сервер не
разбирает и не преобразует полученный YAML: комментарии, неизвестные поля,
порядок ключей и форматирование сохраняются.

## Снимок проекта

`GET /api/project`, а также успешные `POST` и `PUT`, возвращают один
пересчитанный снимок:

```ts
interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
}

interface Coverage {
  total: number;
  automated: number;
  uncovered: number;
}

interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
}

interface StorageArea {
  pattern: string;
  rootPath: string;
  directories: DirectoryNode[];
}

interface FeatureTreeNode {
  attributeCode?: string;
  valueCode?: string;
  valueTitle?: string;
  features: string[];
  children: FeatureTreeNode[];
}

interface FeatureTree {
  code: string;
  title: string;
  groupBy: string[];
  root: FeatureTreeNode;
}

interface DependencyNode {
  code: string;
  title?: string;
  exists: boolean;
}

interface DependencyEdge {
  from: string;
  to: string;
  resolved: boolean;
}

interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

interface ProjectSnapshot {
  revision: number;
  project?: ProjectInfo;
  attributes: Attribute[];
  treeDefinitions: TreeDefinition[];
  features: Feature[];
  diagnostics: Diagnostic[];
  coverage: Coverage;
  storageAreas: StorageArea[];
  trees: FeatureTree[];
  dependencyGraph: DependencyGraph;
}
```

`revision` монотонно увеличивается при каждом полном пересчёте. `path` в
`Diagnostic` — путь файла либо JSON Pointer к полю внутри входной модели.
`StorageArea` создаётся для каждого положительного шаблона `yml.files`; его
`rootPath` — статическая часть шаблона до первого glob (или корень проекта),
а `directories` содержит только существующие каталоги. Исключающие шаблоны
областей не создают.

`FeatureTree.root` — технический корень без атрибута; далее каждый узел
соответствует одному уровню `groupBy`. Фичи в `features` перечислены кодами и
могут входить в несколько ветвей при нескольких значениях атрибута. Для
незаданного группирующего атрибута используются `valueCode: "UNDEFINED"` и
`valueTitle: "Не задано"`.

В графе есть вершина для каждой существующей фичи. Неразрешённая ссылка
добавляет вершину с `exists: false` и ребро с `resolved: false`, поэтому её
можно показать рядом с диагностикой.

При невалидном `.tms.json` уже работающий сервер возвращает снимок только с
`revision` и `diagnostics`; остальные поля из этой модели отсутствуют.

## HTTP API

Все успешные ответы содержат `application/json; charset=utf-8`, кроме SSE.
Код фичи в пути кодируется как один URL-сегмент.

### `GET /api/project`

Возвращает текущий `ProjectSnapshot`.

```http
200 OK
```

### `GET /api/features/:code`

Возвращает исходные байты текущего YAML-файла. Ответ содержит
`Content-Type: application/yaml; charset=utf-8` и `ETag` — MD5 этих байтов в
кавычках.

```http
200 OK
404 Not Found
```

### `GET /api/features/:code?revision=:commit`

`revision` — идентификатор коммита, ранее возвращённый историей этой фичи.
Возвращает исходные байты YAML из этого коммита с
`Content-Type: application/yaml; charset=utf-8`, но без `ETag`. Если фича не
существовала в этой ревизии, коммит не относится к её истории или Git не может
отдать файл, возвращается `404`.

```http
200 OK
404 Not Found
```

### `POST /api/features`

Принимает `CreateFeatureRequest`. `filePath` должен включать имя и суффикс,
лежать внутри проекта, подходить хотя бы под один положительный шаблон
`yml.files` и не подходить ни под один исключающий. Код должен быть уникален,
а путь не должен существовать.

При успехе создаёт недостающие родительские каталоги, записывает минимально
валидный YAML и возвращает новый `ProjectSnapshot`.

```http
201 Created
400 Bad Request
```

### `PUT /api/features/:code`

Принимает YAML непосредственно в теле с
`Content-Type: application/yaml; charset=utf-8`. `:code` выбирает
существующий файл. Заголовок `If-Match` обязателен и должен совпадать с
`ETag`, полученным при чтении файла. Сервер записывает тело как есть, затем
полностью пересчитывает проект и возвращает `ProjectSnapshot`.

```http
200 OK
400 Bad Request
404 Not Found
409 Conflict
```

`409 Conflict` не имеет тела. Сервер не меняет файл при `404` или `409`.
Неразрешённые ссылки, повторные `assert` и ошибки YAML не являются ошибками
записи: они сохраняются и попадают в `diagnostics` нового снимка.

### `GET /api/features/:code/history`

Возвращает историю YAML-файла от новых коммитов к старым.

```ts
interface HistoryEntry {
  commit: string;
  author: string;
  date: string; // ISO 8601 с часовым поясом
  message: string;
}
```

```http
200 OK
Content-Type: application/json

[
  {
    "commit": "a1b2c3d4",
    "author": "Иван Иванов <ivan@example.test>",
    "date": "2026-07-21T09:15:00+03:00",
    "message": "Добавить редактор"
  }
]
```

Если файл не отслеживается или Git недоступен, ответ — `200` и `[]`. Ошибка
Git не влияет на остальные маршруты.

### `GET /api/events`

Открывает поток `text/event-stream`. После каждого пересчёта сервер посылает:

```text
event: project-updated
data: {"revision":42}

```

Событие не содержит снимок. Получив его, клиент запрашивает
`GET /api/project`. Объединённые watcher-события дают одно такое уведомление
на один пересчёт.

## Ошибки запроса

Ошибки валидации `POST` и `PUT` возвращаются как `400`:

```ts
interface RequestError {
  code:
    | 'invalid-body'
    | 'unknown-field'
    | 'invalid-code'
    | 'empty-title'
    | 'duplicate-code'
    | 'duplicate-group-title'
    | 'invalid-attribute'
    | 'invalid-file-path'
    | 'file-already-exists';
  message: string;
  path: string;
}

interface ErrorResponse {
  errors: RequestError[];
}
```

`path` — JSON Pointer, например `/filePath`, `/groups/1/title` или
`/attributes/module/0`. Один запрос может содержать несколько ошибок. Поле
`message` предназначено для отображения, клиент опирается на `code` и `path`.
