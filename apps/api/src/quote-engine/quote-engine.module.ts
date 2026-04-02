import { Module } from '@nestjs/common';
import { QuoteEngineController } from './quote-engine.controller';
import { QuoteEngineService } from './quote-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteEngineController],
  providers: [QuoteEngineService],
  exports: [QuoteEngineService],
})
export class QuoteEngineModule {}
