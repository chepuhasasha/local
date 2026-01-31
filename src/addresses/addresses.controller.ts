import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import type { AddressSearchResult } from './address.types';
import {
  AddressSearchResultDto,
  SearchAddressesRequest,
} from './dto/search-addresses.dto';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @ApiBody({ type: SearchAddressesRequest })
  @ApiOkResponse({ type: AddressSearchResultDto, isArray: true })
  @Post('search')
  async search(
    @Body() request: SearchAddressesRequest,
  ): Promise<AddressSearchResult[]> {
    return this.addressesService.search(request);
  }
}
