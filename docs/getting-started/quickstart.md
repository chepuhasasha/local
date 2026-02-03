<- [Содержание](../../README.md)

---

# Быстрый старт

Этот раздел помогает запустить сервис локально с минимальным набором действий. Команды и переменные соответствуют текущему репозиторию.

## Шаги

1) Установите зависимости:

```bash
npm install
```

2) Подготовьте переменные окружения:

```bash
cp .env.development.example .env
```

3) Запустите PostgreSQL через docker-compose:

```bash
docker-compose up -d
```

4) Импортируйте адреса (таблицы создаются в процессе импорта):

```bash
npm run import:addresses:dev
```

5) Запустите API:

```bash
npm run start:dev
```

Swagger UI будет доступен по адресу `http://localhost:3000/docs`.
