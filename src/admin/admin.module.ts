import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DashboardModule, UsersModule],
})
export class AdminModule {}
