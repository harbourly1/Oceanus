import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadScoringService } from './lead-scoring.service';
import { TaskReminderService } from './task-reminder.service';
import { PolicyRenewalService } from './policy-renewal.service';
import { AllocationModule } from '../allocation/allocation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AllocationModule, NotificationsModule, ActivityModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadScoringService, TaskReminderService, PolicyRenewalService],
  exports: [LeadsService, LeadScoringService],
})
export class LeadsModule {}
