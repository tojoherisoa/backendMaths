import { Router, Request, Response } from 'express';
import { SeriesService } from '../services/seriesService';

const router = Router();
const seriesService = new SeriesService();

// Save a new series
router.post('/', async (req: Request, res: Response) => {
    try {
        const { sessionId, numbers, source } = req.body;

        if (!sessionId || !numbers || !source) {
            return res.status(400).json({ error: 'sessionId, numbers, and source are required' });
        }

        if (!Array.isArray(numbers)) {
            return res.status(400).json({ error: 'numbers must be an array' });
        }

        if (!['HTML', 'OCR', 'MANUAL'].includes(source)) {
            return res.status(400).json({ error: 'source must be HTML, OCR, or MANUAL' });
        }

        // Check for duplicates
        const isDuplicate = await seriesService.checkDuplicates(sessionId, numbers);
        if (isDuplicate) {
            return res.status(200).json({
                message: 'Series already exists',
                duplicate: true
            });
        }

        const series = await seriesService.saveSeries(sessionId, numbers, source);

        return res.json({
            success: true,
            series,
        });
    } catch (error: any) {
        console.error('Save series error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Get paginated series for a session
router.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await seriesService.getSessionSeries(sessionId, page, limit);

        return res.json(result);
    } catch (error: any) {
        console.error('Get series error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Get all numbers from all series (assembled)
router.get('/:sessionId/all', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const numbers = await seriesService.getAllSessionNumbers(sessionId);

        return res.json({
            success: true,
            numbers,
            count: numbers.length,
        });
    } catch (error: any) {
        console.error('Get all numbers error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Delete a series
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await seriesService.deleteSeries(id);

        return res.json({
            success: true,
            message: 'Series deleted',
        });
    } catch (error: any) {
        console.error('Delete series error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
