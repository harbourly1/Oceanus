import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchService } from './search.service';

@ApiTags('Search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across leads, customers, and policies' })
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(q || '', limit ? Number(limit) : 5);
  }
}
