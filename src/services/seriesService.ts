import { prisma } from '../lib/prisma';

export interface SeriesEntry {
    id: string;
    sessionId: string;
    numbers: number[];
    source: 'HTML' | 'OCR' | 'MANUAL';
    count: number;
    createdAt: Date;
}

export class SeriesService {
    /**
     * Save a new series to the database
     */
    async saveSeries(sessionId: string, numbers: number[], source: 'HTML' | 'OCR' | 'MANUAL'): Promise<SeriesEntry> {
        const series = await prisma.numberSeries.create({
            data: {
                sessionId,
                numbers: JSON.stringify(numbers),
                source,
                count: numbers.length,
            },
        });

        return {
            id: series.id,
            sessionId: series.sessionId,
            numbers: JSON.parse(series.numbers),
            source: series.source as 'HTML' | 'OCR' | 'MANUAL',
            count: series.count,
            createdAt: series.createdAt,
        };
    }

    /**
     * Get paginated series for a session
     */
    async getSessionSeries(sessionId: string, page: number = 1, limit: number = 10): Promise<{
        series: SeriesEntry[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [series, total] = await Promise.all([
            prisma.numberSeries.findMany({
                where: { sessionId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.numberSeries.count({
                where: { sessionId },
            }),
        ]);

        return {
            series: series.map((s: any) => ({
                id: s.id,
                sessionId: s.sessionId,
                numbers: JSON.parse(s.numbers),
                source: s.source as 'HTML' | 'OCR' | 'MANUAL',
                count: s.count,
                createdAt: s.createdAt,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get all numbers from all series in chronological order
     */
    async getAllSessionNumbers(sessionId: string): Promise<number[]> {
        const series = await prisma.numberSeries.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });

        const allNumbers: number[] = [];

        for (const s of series) {
            const numbers = JSON.parse(s.numbers) as number[];
            allNumbers.push(...numbers);
        }

        return allNumbers;
    }

    /**
     * Delete a series by ID
     */
    async deleteSeries(id: string): Promise<void> {
        await prisma.numberSeries.delete({
            where: { id },
        });
    }

    /**
     * Check if numbers already exist in recent series (to avoid duplicates)
     */
    async checkDuplicates(sessionId: string, numbers: number[]): Promise<boolean> {
        const recentSeries = await prisma.numberSeries.findFirst({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });

        if (!recentSeries) {
            return false;
        }

        const recentNumbers = JSON.parse(recentSeries.numbers) as number[];

        // Check if arrays are identical
        if (recentNumbers.length !== numbers.length) {
            return false;
        }

        return recentNumbers.every((num, idx) => num === numbers[idx]);
    }
}
