import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import {
  AddressSearchLanguage,
  AddressSearchResult,
  SearchAddressesRequest,
} from './dto/search-addresses.dto';

interface AddressRow {
  id: string;
  display_ko: string | null;
  display_en: string | null;
  search_ko: string | null;
  search_en: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class AddressesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Ищет адреса по строке пользователя и возвращает список совпадений.
   */
  async search(
    request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    const query = request.query?.trim();
    if (!query) {
      throw new BadRequestException('Параметр query обязателен.');
    }

    const limit = this.normalizeLimit(request.limit);
    const offset = this.normalizeOffset(request.offset);
    const lang = this.normalizeLanguage(request.lang);
    const searchValue = `%${query.toLowerCase()}%`;

    const { text, values } = this.buildSearchQuery(
      lang,
      searchValue,
      limit,
      offset,
    );
    const result = await this.pool.query<AddressRow>(text, values);

    return result.rows.map((row) => ({
      id: row.id,
      display: { ko: row.display_ko, en: row.display_en },
      search: { ko: row.search_ko, en: row.search_en },
      payload: row.payload,
    }));
  }

  /**
   * Нормализует лимит выдачи, чтобы не перегружать базу.
   */
  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return 20;
    }
    return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
  }

  /**
   * Нормализует смещение выдачи.
   */
  private normalizeOffset(offset?: number): number {
    if (!Number.isFinite(offset)) {
      return 0;
    }
    return Math.max(Math.trunc(offset ?? 0), 0);
  }

  /**
   * Нормализует выбор языка для поиска.
   */
  private normalizeLanguage(
    lang?: AddressSearchLanguage,
  ): AddressSearchLanguage {
    if (lang === 'ko' || lang === 'en') {
      return lang;
    }
    return 'any';
  }

  /**
   * Формирует SQL запрос для поиска по адресам.
   */
  private buildSearchQuery(
    lang: AddressSearchLanguage,
    searchValue: string,
    limit: number,
    offset: number,
  ): { text: string; values: Array<string | number> } {
    const conditions =
      lang === 'ko'
        ? 'search_ko ILIKE $1'
        : lang === 'en'
          ? 'search_en ILIKE $1'
          : '(search_ko ILIKE $1 OR search_en ILIKE $1)';

    return {
      text: `
        SELECT id, display_ko, display_en, search_ko, search_en, payload
        FROM addresses
        WHERE ${conditions}
        ORDER BY id
        LIMIT $2 OFFSET $3
      `,
      values: [searchValue, limit, offset],
    };
  }
}
