import { Body, Controller, Post } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import {
  AddressSearchResult,
  SearchAddressesRequest,
} from './dto/search-addresses.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Выполняет поиск адресов по пользовательскому запросу.
   */
  @Post('search')
  async search(
    @Body() request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    return this.addressesService.search(request);
  }
}
