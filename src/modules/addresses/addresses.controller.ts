import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AddressesService } from '@/modules/addresses/addresses.service';
import type { AddressSearchResult } from '@/modules/addresses/types/addresses.types';
import {
  AddressSearchResultDto,
  SearchAddressesRequest,
} from '@/modules/addresses/dto/search-addresses.dto';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Выполняет поиск адресов по строке запроса.
   */
  @ApiBody({ type: SearchAddressesRequest })
  @ApiOkResponse({ type: AddressSearchResultDto, isArray: true })
  @Post('search')
  async search(
    @Body() request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    return this.addressesService.search(request);
  }
}
