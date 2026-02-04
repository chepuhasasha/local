<- [Содержание](../README.md)

---

# Деплой: Docker
Owner: Ops Team
Last reviewed: 2026-02-04

## Цель
Описать доступные Docker-артефакты и сценарии запуска.

## Контекст
В репозитории есть только `docker-compose.yml` для PostgreSQL.

## Шаги
1. Используйте docker-compose для локальной БД.
2. Для контейнеризации приложения добавьте Dockerfile.

## docker-compose (PostgreSQL)
В репозитории есть `docker-compose.yml` для запуска PostgreSQL локально. Он не включает контейнер приложения.

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

## Ограничения
Документ описывает только локальную БД, а не production контейнеризацию.

## См. также
- [Деплой: обзор](deployment-guide.md)
- [Локальная настройка](../guide/local-setup.md)
