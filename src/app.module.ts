import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationController } from './controllers/aggregation.controller';
import { DataAggregationService } from './services/data-aggregation.service';
import { TransactionApiService } from './services/transaction-api.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 120000, // 2 minutes
    }),
  ],
  controllers: [AggregationController],
  providers: [DataAggregationService, TransactionApiService],
})
export class AppModule {}
