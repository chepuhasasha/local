<- [Содержание](../README.md)

---

# Быстрый старт
Owner: Backend Team
Last reviewed: 2026-02-04

## Цель
Запустить API локально с минимальным количеством шагов.

## Контекст
Подразумевается локальная разработка и PostgreSQL (через Docker или внешнюю БД).

## Шаги
1. Установите зависимости:

```bash
npm install
```

2. Подготовьте переменные окружения:

```bash
cp .env.development.example .env
```

3. Запустите PostgreSQL (локально через Docker):

```bash
docker-compose up -d
```

4. Запустите миграции доменных таблиц:

```bash
npm run migration:run
```

5. Импортируйте адреса (создаёт таблицы и индексы):

```bash
npm run import:addresses:dev
```

6. Запустите API:

```bash
npm run start:dev
```

Swagger UI будет доступен по адресу `http://localhost:3000/docs` (если `SWAGGER_ENABLED` включён).

## Проверка

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":5,"offset":0,"lang":"any"}'
```

## Ограничения
Без импорта адресов `/addresses/search` будет возвращать пустой массив.

## См. также
- [Локальная настройка](local-setup.md)
- [Импорт адресов](../how-to/addresses-import.md)
- [Переменные окружения](../reference/configuration/environment-variables.md)
