import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuoteEngineService } from './quote-engine.service';

@ApiTags('Quote Engine')
@Controller('quote-engine')
export class QuoteEngineController {
  constructor(private quoteEngine: QuoteEngineService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate quotes for a product (public — no auth)' })
  async calculate(@Body() body: { productCode: string; formData: Record<string, any> }) {
    return this.quoteEngine.calculateQuotes(body.productCode, body.formData);
  }
}
