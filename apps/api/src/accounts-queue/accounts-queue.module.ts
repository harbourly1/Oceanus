import { Module } from '@nestjs/common';
import { AccountsQueueController } from './accounts-queue.controller';
import { AccountsQueueService } from './accounts-queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';
import { UwAssignmentsModule } from '../uw-assignments/uw-assignments.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ActivityModule, UwAssignmentsModule],
  controllers: [AccountsQueueController],
  providers: [AccountsQueueService],
  exports: [AccountsQueueService],
})
export class AccountsQueueModule {}
