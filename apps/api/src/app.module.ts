import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { PoliciesModule } from './policies/policies.module';
import { EndorsementsModule } from './endorsements/endorsements.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AccountsQueueModule } from './accounts-queue/accounts-queue.module';
import { UwAssignmentsModule } from './uw-assignments/uw-assignments.module';
import { AllocationModule } from './allocation/allocation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { UploadsModule } from './uploads/uploads.module';
import { ActivityModule } from './activity/activity.module';
import { EmailModule } from './email/email.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { ProductCatalogModule } from './product-catalog/product-catalog.module';
import { InsurersModule } from './insurers/insurers.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { QuoteEngineModule } from './quote-engine/quote-engine.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CustomersModule,
    PoliciesModule,
    EndorsementsModule,
    InvoicesModule,
    AccountsQueueModule,
    UwAssignmentsModule,
    AllocationModule,
    NotificationsModule,
    ReportsModule,
    HealthModule,
    UploadsModule,
    ActivityModule,
    EmailModule,
    SystemConfigModule,
    ProductCatalogModule,
    InsurersModule,
    ReferenceDataModule,
    QuoteEngineModule,
    SearchModule,
  ],
})
export class AppModule {}
