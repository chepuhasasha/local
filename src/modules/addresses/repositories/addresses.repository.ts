import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository, type SelectQueryBuilder } from 'typeorm';

import { AddressEntity } from '@/modules/addresses/entities/address.entity';
import type { AddressSearchLanguage } from '@/modules/addresses/types/addresses.types';

/**
 * Репозиторий для чтения адресов из базы данных.
 */
@Injectable()
export class AddressesRepository {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
  ) {}

  /**
   * Выполняет поиск адресов с учётом языка и пагинации.
   */
  async search(params: {
    lang: AddressSearchLanguage;
    searchValue: string;
    limit: number;
    offset: number;
  }): Promise<AddressEntity[]> {
    const queryBuilder = this.buildSearchQuery(
      params.lang,
      params.searchValue,
      params.limit,
      params.offset,
    );

    return queryBuilder.getMany();
  }

  /**
   * Формирует запрос поиска по адресам через TypeORM.
   */
  private buildSearchQuery(
    lang: AddressSearchLanguage,
    searchValue: string,
    limit: number,
    offset: number,
  ): SelectQueryBuilder<AddressEntity> {
    const queryBuilder = this.addressRepository
      .createQueryBuilder('address')
      .orderBy('address.id', 'ASC')
      .limit(limit)
      .offset(offset);

    if (lang === 'ko') {
      return queryBuilder.where('address.searchKo ILIKE :search', {
        search: searchValue,
      });
    }

    if (lang === 'en') {
      return queryBuilder.where('address.searchEn ILIKE :search', {
        search: searchValue,
      });
    }

    return queryBuilder.where(
      '(address.searchKo ILIKE :search OR address.searchEn ILIKE :search)',
      { search: searchValue },
    );
  }
}
