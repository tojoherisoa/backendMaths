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
     * Get all numbers from all series in chronological order, with smart deduplication
     * Handles cases where user re-pastes full history with new items
     */
    async getAllSessionNumbers(sessionId: string): Promise<number[]> {
        // 1. Get all series ordered by creation date (newest first)
        const series = await prisma.numberSeries.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });

        const keptSeries: number[][] = [];

        // 2. Filter out subsets
        for (const s of series) {
            const currentNumbers = JSON.parse(s.numbers) as number[];

            // Check if this series is already contained in a series we decided to keep
            // (We check against keptSeries which are newer or larger)
            let isSubset = false;
            for (const kept of keptSeries) {
                if (this.isSubsequence(currentNumbers, kept)) {
                    isSubset = true;
                    break;
                }
            }

            if (!isSubset) {
                keptSeries.push(currentNumbers);
            }
        }

        // 3. Assemble in chronological order (since we processed DESC, we reverse to get ASC)
        // But wait, if we have distinct chunks [4,5,6] (new) and [1,2,3] (old), 
        // keptSeries has [[4,5,6], [1,2,3]].
        // We want [1,2,3, 4,5,6].
        // So we reverse keptSeries.
        keptSeries.reverse();

        const allNumbers: number[] = [];
        for (const nums of keptSeries) {
            allNumbers.push(...nums);
        }

        return allNumbers;
    }

    /**
     * Helper to check if array A is a subsequence of array B
     * (Simple implementation: checks if A is a contiguous subarray of B)
     */
    private isSubsequence(subset: number[], superset: number[]): boolean {
        if (subset.length > superset.length) return false;

        // Convert to string for easy substring check (hacky but effective for exact sequence match)
        // Using a separator to avoid partial number matches (e.g. "1" in "12")
        const subStr = subset.join('|');
        const superStr = superset.join('|');

        return superStr.includes(subStr);
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
