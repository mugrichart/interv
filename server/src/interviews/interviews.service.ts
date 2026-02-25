import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface InterviewEntry {
    type: 'presentation' | 'question_feedback' | 'other';
    applicantName: string;
    rawText: string;
    summary: string;
    highlights: string[];
    addresser: string;
    addressee: string;
    timestamp: string;
}

export interface Interview {
    id: string;
    title: string;
    entries: InterviewEntry[];
}

@Injectable()
export class InterviewsService {
    private dbPath = path.join(process.cwd(), 'db.json');

    private readDb(): { interviews: Interview[] } {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(data);
    }

    private writeDb(data: { interviews: Interview[] }) {
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }

    findAll(): Interview[] {
        return this.readDb().interviews;
    }

    findOne(id: string): Interview {
        const db = this.readDb();
        const interview = db.interviews.find((i) => i.id === id);
        if (!interview) throw new NotFoundException('Interview not found');
        return interview;
    }

    create(title: string): Interview {
        const db = this.readDb();
        const newInterview: Interview = {
            id: uuidv4(),
            title: title || `${new Date().toISOString().split('T')[0]}-interview`,
            entries: [],
        };
        db.interviews.push(newInterview);
        this.writeDb(db);
        return newInterview;
    }

    remove(id: string): void {
        const db = this.readDb();
        const index = db.interviews.findIndex((i) => i.id === id);
        if (index === -1) throw new NotFoundException('Interview not found');
        db.interviews.splice(index, 1);
        this.writeDb(db);
    }

    addEntry(interviewId: string, entry: InterviewEntry): Interview {
        const db = this.readDb();
        const index = db.interviews.findIndex((i) => i.id === interviewId);
        if (index === -1) throw new NotFoundException('Interview not found');

        db.interviews[index].entries.push(entry);
        this.writeDb(db);
        return db.interviews[index];
    }
}
