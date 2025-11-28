import { Router, Request, Response } from 'express';
import { SequenceAnalyzer } from '../services/predictionService';
import { prisma } from '../lib/prisma';
import { SeriesService } from '../services/seriesService';

const router = Router();
const analyzer = new SequenceAnalyzer();
const seriesService = new SeriesService();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { history, sessionId } = req.body;

        if (!history || !Array.isArray(history) || history.length < 3) {
            return res.status(400).json({
                error: 'Invalid history. Must be an array of at least 3 numbers.',
            });
        }

        const prediction = analyzer.predict(history);

        if (sessionId) {
            await prisma.numberSequence.create({
                data: {
                    sessionId,
                    inputValues: JSON.stringify(history),
                    isDeterministic: prediction.isDeterministic,
                    confidenceScore: prediction.confidence,
                    predictionLogs: {
                        create: {
                            predictedValues: JSON.stringify(prediction.nextValues),
                        },
                    },
                },
            });
        }

        return res.json(prediction);
    } catch (error) {
        console.error('Prediction error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
