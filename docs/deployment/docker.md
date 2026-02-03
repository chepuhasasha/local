<- [Содержание](../../README.md)

---

# Деплой: Docker

Документ описывает доступные Docker-артефакты и сценарии запуска.

## docker-compose (PostgreSQL)

В репозитории есть `docker-compose.yml` для запуска PostgreSQL локально. Он **не** включает контейнер приложения.

### Что делает compose

- Поднимает сервис `postgres:15`.
- Использует переменные окружения из `.env`.
- Пробрасывает порт `${POSTGRES_PORT:-5432}`.
- Сохраняет данные в volume `postgres_data`.

### Пример запуска

```bash
docker-compose up -d
```

### Проверка подключения

```bash
psql -h localhost -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER} ${POSTGRES_DB}
```

## Чего нет

- Dockerfile для приложения.
- Multi-stage сборки.
- Образов в registry.

Если нужен полноценный Docker-деплой, необходимо добавить Dockerfile и описать процесс запуска (см. [Деплой: обзор](deployment-guide.md)).
