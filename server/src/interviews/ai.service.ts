import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiService {
    private openai: OpenAI;

    constructor(private configService: ConfigService) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
    }

    async transcribe(audioPath: string): Promise<string> {
        try {
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: 'whisper-1',
            });
            return transcription.text;
        } catch (error) {
            console.error('Transcription error:', error);
            throw new InternalServerErrorException('Failed to transcribe audio');
        }
    }

    async synthesize(text: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant helping with interview notes for an Operational Research scholarship.
            From the provided transcript, extract:
            1. Applicant Name (e.g., Daisy or Richard).
            2. A summary in exactly 3 paragraphs.
            3. Exactly 5 highlights, each being a full sentence.
            
            Return the result in JSON format:
            {
              "applicantName": "string",
              "summary": "string",
              "highlights": ["string", "string", "string", "string", "string"]
            }`,
                    },
                    {
                        role: 'user',
                        content: text,
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            if (!content) {
                throw new Error('OpenAI returned an empty response');
            }
            return JSON.parse(content);
        } catch (error) {
            console.error('Synthesis error:', error);
            throw new InternalServerErrorException('Failed to synthesize text');
        }
    }

    async generateQuestions(transcriptContext: string, targetPerson?: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant helping an applicant in a Group Interview for an Operational Research scholarship.
            ${targetPerson ? `Generate 3 "supportive yet insightful" collaborative questions specifically for ${targetPerson} based on their presentation/contributions.` : `Based on the last 5 minutes of transcript, generate 3 "supportive yet insightful" collaborative questions.`}
            The questions should be suitable for an Operational Research context (e.g., asking about model constraints, social impact, or data sources).
            The goal is to show the applicant is collaborative and thinks deeply about the problem.
            
            Return the result in JSON format:
            {
              "questions": ["string", "string", "string"]
            }`,
                    },
                    {
                        role: 'user',
                        content: transcriptContext,
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            if (!content) {
                throw new Error('OpenAI returned an empty response');
            }
            return JSON.parse(content);
        } catch (error) {
            console.error('Question generation error:', error);
            throw new InternalServerErrorException('Failed to generate questions');
        }
    }
}
