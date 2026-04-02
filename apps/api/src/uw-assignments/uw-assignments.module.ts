import { Module } from '@nestjs/common';
import { UwAssignmentsController } from './uw-assignments.controller';
import { UwAssignmentsService } from './uw-assignments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ActivityModule],
  controllers: [UwAssignmentsController],
  providers: [UwAssignmentsService],
  exports: [UwAssignmentsService],
})
export class UwAssignmentsModule {}
