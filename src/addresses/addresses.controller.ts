import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import {
  AddressSearchResult,
  SearchAddressesRequest,
} from './dto/search-addresses.dto';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  /**
   * Создаёт контроллер для обработки запросов к адресам.
   */
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Выполняет поиск адресов по пользовательскому запросу.
   */
  @ApiBody({ type: SearchAddressesRequest })
  @ApiOkResponse({ type: AddressSearchResult, isArray: true })
  @Post('search')
  async search(
    @Body() request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    return this.addressesService.search(request);
  }
}
