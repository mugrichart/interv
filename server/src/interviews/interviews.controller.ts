import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseInterceptors,
    UploadedFile,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewsService, InterviewEntry } from './interviews.service';
import { AiService } from './ai.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('interviews')
export class InterviewsController {
    constructor(
        private readonly interviewsService: InterviewsService,
        private readonly aiService: AiService,
    ) { }

    @Get()
    findAll() {
        return this.interviewsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.interviewsService.findOne(id);
    }

    @Post()
    create(@Body('title') title: string) {
        return this.interviewsService.create(title);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        this.interviewsService.remove(id);
        return { success: true };
    }

    @Post(':id/record')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: join(process.cwd(), 'uploads'),
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    async addRecording(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('type') type: 'presentation' | 'question_feedback' | 'other',
        @Body('addresser') addresser: string,
        @Body('addressee') addressee: string,
        @Body('interviewUser') interviewUser: string,
    ) {
        // 1. Transcribe
        const transcript = await this.aiService.transcribe(file.path);

        // 2. Synthesize
        const synthesis = await this.aiService.synthesize(transcript, interviewUser);

        // 3. Create entry
        const entry: InterviewEntry = {
            type,
            applicantName: synthesis.applicantName,
            rawText: transcript,
            summary: synthesis.summary,
            highlights: synthesis.highlights,
            addresser,
            addressee,
            timestamp: new Date().toISOString(),
        };

        // 4. Save
        const interview = this.interviewsService.addEntry(id, entry);

        // Cleanup file
        fs.unlinkSync(file.path);

        return interview;
    }

    @Post(':id/suggest-questions')
    async suggestQuestions(
        @Param('id') id: string,
        @Body('targetPerson') targetPerson?: string,
        @Body('interviewUser') interviewUser?: string,
    ) {
        const interview = this.interviewsService.findOne(id);

        let recentTranscripts = '';

        if (targetPerson) {
            // Filter entries where targetPerson was the addresser
            recentTranscripts = interview.entries
                .filter((e) => e.addresser?.toLowerCase() === targetPerson.toLowerCase())
                .slice(-3)
                .map((e) => e.rawText)
                .join('\n');

            // If no entries found for targetPerson, fallback to general context but keep targetPerson flag
            if (!recentTranscripts) {
                recentTranscripts = interview.entries
                    .slice(-3)
                    .map((e) => e.rawText)
                    .join('\n');
            }
        } else {
            // Use last 5 minutes of transcripts (for MVP, let's just use last 3 entries or all if less)
            recentTranscripts = interview.entries
                .slice(-3)
                .map((e) => e.rawText)
                .join('\n');
        }

        return this.aiService.generateQuestions(recentTranscripts, targetPerson, interviewUser);
    }
}
