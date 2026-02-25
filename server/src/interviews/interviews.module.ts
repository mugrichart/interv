import { Module } from '@nestjs/common';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { AiService } from './ai.service';

@Module({
    controllers: [InterviewsController],
    providers: [InterviewsService, AiService],
})
export class InterviewsModule { }
