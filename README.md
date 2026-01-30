<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Описание

Сервис предоставляет простое API для поиска адресов. Данные берутся из
`scripts/get_addresses.js`, сохраняются в PostgreSQL и доступны через HTTP.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка зависимостей

```bash
npm install
```

## Настройка базы данных (docker-compose)

1. Запустите PostgreSQL через docker-compose:

   ```bash
   docker-compose up -d
   ```

2. Примените схему и индексы:

   ```bash
   docker-compose exec -T postgres psql -U addresses_user -d addresses -f /app/scripts/init_db.sql
   ```

   Команда использует путь `/app`, поэтому запускать её нужно из корня репозитория.

## Загрузка адресов

1. Скачайте и конвертируйте данные:

   ```bash
   node scripts/get_addresses.js --month 202512
   ```

   Чанки будут сохранены в `./out`.

2. Загрузите чанки в PostgreSQL:

   ```bash
   export DATABASE_URL="postgresql://addresses_user:addresses_password@localhost:5432/addresses"
   node scripts/load_addresses.js ./out 1000
   ```

   Второй аргумент — размер пакета вставки (по умолчанию 1000).

## Запуск приложения

Перед запуском задайте строку подключения:

```bash
export DATABASE_URL="postgresql://addresses_user:addresses_password@localhost:5432/addresses"
```

Затем запустите сервис:

```bash
npm run start:dev
```

## API

### POST `/addresses/search`

Поиск адресов по строке пользователя.

```json
{
  "query": "Seoul",
  "limit": 20,
  "offset": 0,
  "lang": "any"
}
```

- `query` — строка поиска (обязательно).
- `limit` — максимум элементов (по умолчанию 20, максимум 50).
- `offset` — смещение (по умолчанию 0).
- `lang` — `ko`, `en` или `any` (по умолчанию `any`).

Ответ:

```json
[
  {
    "id": "1234567890",
    "display": {
      "ko": "서울특별시 ...",
      "en": "Seoul ..."
    },
    "search": {
      "ko": "서울특별시 ...",
      "en": "seoul ..."
    },
    "payload": {}
  }
]
```
