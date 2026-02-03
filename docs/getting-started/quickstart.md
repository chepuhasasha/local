<- [Содержание](../../README.md)

---

# Быстрый старт

Этот документ даёт минимальный набор шагов, чтобы поднять API локально. Если нужен полный контекст (требования, конфигурация, импорт, диагностика), переходите в [Локальная настройка](local-setup.md).

## Шаги

1) Установите зависимости:

```bash
npm install
```

2) Подготовьте переменные окружения:

```bash
cp .env.development.example .env
```

3) Запустите PostgreSQL (локально через Docker):

```bash
docker-compose up -d
```

4) Импортируйте адреса (создаёт таблицы и индексы):

```bash
npm run import:addresses:dev
```

5) Запустите API:

```bash
npm run start:dev
```

Swagger UI будет доступен по адресу `http://localhost:3000/docs`.

## Проверка

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/addresses/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Seoul","limit":5,"offset":0,"lang":"any"}'
```
