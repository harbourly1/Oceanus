import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProductCatalogService } from './product-catalog.service';
import { ActivityService } from '../activity/activity.service';

@ApiTags('Product Catalog')
@Controller('product-catalog')
export class ProductCatalogController {
  constructor(
    private catalogService: ProductCatalogService,
    private activity: ActivityService,
  ) {}

  // ─── Public endpoints (no auth — for landing page) ────────────────────────

  @Get('public')
  @ApiOperation({ summary: 'Get full public catalog (products, insurers, rates, modifiers, inclusions)' })
  async getPublicCatalog() {
    return this.catalogService.getPublicCatalog();
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Get('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_ADMIN', 'SALES_EXEC', 'UNDERWRITER', 'ACCOUNTS')
  @ApiOperation({ summary: 'List all products' })
  async listProducts(@Query('active') active?: string) {
    return this.catalogService.findAllProducts(active !== 'false');
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get product with full details' })
  async getProduct(@Param('id') id: string) {
    return this.catalogService.findProductById(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Body() body: any, @CurrentUser('id') userId: string) {
    const product = await this.catalogService.createProduct(body);
    this.activity.log({ entityId: product.id, entityType: 'product', userId, action: 'CREATED', detail: `Product ${product.code} — ${product.label} created` });
    return product;
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a product' })
  async updateProduct(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    const product = await this.catalogService.updateProduct(id, body);
    this.activity.log({ entityId: id, entityType: 'product', userId, action: 'EDITED', detail: `Product ${product.code} updated` });
    return product;
  }

  // ─── Rate Tables ──────────────────────────────────────────────────────────

  @Get('products/:productId/rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get rate tables for a product' })
  async getProductRates(@Param('productId') productId: string) {
    return this.catalogService.findRatesByProduct(productId);
  }

  @Post('products/:productId/rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Upsert a rate table entry' })
  async upsertRate(
    @Param('productId') productId: string,
    @Body() body: { insurerId: string; rate: number; effectiveFrom: string },
    @CurrentUser('id') userId: string,
  ) {
    const rate = await this.catalogService.upsertRate(productId, body.insurerId, body.rate, new Date(body.effectiveFrom));
    this.activity.log({ entityId: rate.id, entityType: 'rate_table', userId, action: 'EDITED', detail: `Rate ${(body.rate * 100).toFixed(3)}% effective ${body.effectiveFrom}` });
    return rate;
  }

  // ─── Risk Modifiers ───────────────────────────────────────────────────────

  @Get('modifiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all risk modifiers' })
  async listModifiers() {
    return this.catalogService.findAllModifiers();
  }

  @Post('modifiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a risk modifier' })
  async createModifier(@Body() body: any, @CurrentUser('id') userId: string) {
    const modifier = await this.catalogService.createModifier(body);
    this.activity.log({ entityId: modifier.id, entityType: 'modifier', userId, action: 'CREATED', detail: `Modifier ${modifier.modifierType} / ${modifier.conditionKey} (${modifier.factor}x) created` });
    return modifier;
  }

  @Patch('modifiers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a risk modifier' })
  async updateModifier(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    const modifier = await this.catalogService.updateModifier(id, body);
    this.activity.log({ entityId: id, entityType: 'modifier', userId, action: 'EDITED', detail: `Modifier ${modifier.modifierType} updated` });
    return modifier;
  }

  // ─── Coverage Inclusions ──────────────────────────────────────────────────

  @Get('products/:productId/inclusions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get coverage inclusions for a product' })
  async getProductInclusions(@Param('productId') productId: string) {
    return this.catalogService.findInclusionsByProduct(productId);
  }

  @Post('products/:productId/inclusions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a coverage inclusion' })
  async createInclusion(@Param('productId') productId: string, @Body() body: any, @CurrentUser('id') userId: string) {
    const inc = await this.catalogService.createInclusion({ ...body, productId });
    this.activity.log({ entityId: inc.id, entityType: 'inclusion', userId, action: 'CREATED', detail: `Inclusion "${inc.inclusionText}" added` });
    return inc;
  }

  // ─── Commission Schedules ─────────────────────────────────────────────────

  @Get('products/:productId/commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get commission schedules for a product' })
  async getProductCommissions(@Param('productId') productId: string) {
    return this.catalogService.findCommissionByProduct(productId);
  }
}
