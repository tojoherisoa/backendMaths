import { prisma } from '../lib/prisma';

export class SessionService {
    async createSession(studentName: string, mode: string = 'EDUCATION') {
        return await prisma.session.create({
            data: {
                studentName: studentName || 'Anonymous',
                mode: mode,
            },
        });
    }

    async getSession(id: string) {
        return await prisma.session.findUnique({
            where: { id },
            include: { numberSequences: true },
        });
    }
}
