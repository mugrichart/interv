import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InterviewsModule } from './interviews/interviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    InterviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
