import { Router, Request, Response } from 'express';
import multer from 'multer';
import { OCRService } from '../services/ocrService';
import { SeriesService } from '../services/seriesService';

const router = Router();
const ocrService = new OCRService();
const seriesService = new SeriesService();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const numbers = await ocrService.extractNumbers(req.file.buffer);

        // Sort numbers by their appearance (already in order from OCR)
        // Round to 2 decimal places for consistency
        const formattedNumbers = numbers.map(n => Math.round(n * 100) / 100);

        return res.json({
            success: true,
            numbers: formattedNumbers,
            count: formattedNumbers.length,
            stats: {
                min: Math.min(...formattedNumbers),
                max: Math.max(...formattedNumbers),
                avg: formattedNumbers.reduce((a, b) => a + b, 0) / formattedNumbers.length,
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// New endpoint: Parse HTML content
router.post('/html', async (req: Request, res: Response) => {
    try {
        const { html } = req.body;

        if (!html || typeof html !== 'string') {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        const numbers = ocrService.extractFromHTML(html);

        return res.json({
            success: true,
            numbers,
            count: numbers.length,
            stats: numbers.length > 0 ? {
                min: Math.min(...numbers),
                max: Math.max(...numbers),
                avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
            } : null
        });
    } catch (error: any) {
        console.error('HTML parsing error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Manual input endpoint
router.post('/manual', async (req: Request, res: Response) => {
    try {
        const { numbers } = req.body;

        if (!Array.isArray(numbers)) {
            return res.status(400).json({ error: 'Numbers must be an array' });
        }

        const validNumbers = numbers
            .map(n => parseFloat(n))
            .filter(n => !isNaN(n))
            .map(n => Math.round(n * 100) / 100);

        return res.json({
            success: true,
            numbers: validNumbers,
            count: validNumbers.length,
        });
    } catch (error: any) {
        console.error('Manual input error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
