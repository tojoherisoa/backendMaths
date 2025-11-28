import { Router, Request, Response } from 'express';
import { SessionService } from '../services/sessionService';

const router = Router();
const sessionService = new SessionService();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { studentName, mode } = req.body;
        const session = await sessionService.createSession(studentName, mode);
        return res.json(session);
    } catch (error) {
        console.error('Session creation error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
