import { prisma } from './src/lib/prisma';

async function checkDatabase() {
    console.log('🔍 Vérification de la base de données...\n');

    try {
        // 1. Vérifier les sessions
        console.log('📋 TABLE: Session');
        const sessions = await prisma.session.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Total sessions récentes: ${sessions.length}`);
        sessions.forEach((s, idx) => {
            console.log(`  ${idx + 1}. ID: ${s.id.substring(0, 8)}... | Student: ${s.studentName} | Created: ${s.createdAt.toLocaleString()}`);
        });

        // 2. Vérifier les NumberSeries
        console.log('\n📊 TABLE: NumberSeries (Données Importées)');
        const series = await prisma.numberSeries.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                session: true
            }
        });
        console.log(`Total series récentes: ${series.length}`);
        series.forEach((s, idx) => {
            const numbers = JSON.parse(s.numbers);
            console.log(`  ${idx + 1}. ID: ${s.id.substring(0, 8)}... | Session: ${s.session.studentName} | Source: ${s.source} | Count: ${s.count} | Created: ${s.createdAt.toLocaleString()}`);
            console.log(`     First 5 numbers: ${numbers.slice(0, 5).join(', ')}`);
        });

        // 3. Vérifier les NumberSequence
        console.log('\n🔢 TABLE: NumberSequence (Prédictions)');
        const sequences = await prisma.numberSequence.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Total sequences récentes: ${sequences.length}`);
        sequences.forEach((s, idx) => {
            const inputs = JSON.parse(s.inputValues);
            console.log(`  ${idx + 1}. ID: ${s.id.substring(0, 8)}... | Session: ${s.sessionId.substring(0, 8)}... | Deterministic: ${s.isDeterministic} | Confidence: ${s.confidenceScore.toFixed(2)}`);
            console.log(`     Input values: ${inputs.slice(0, 5).join(', ')}${inputs.length > 5 ? '...' : ''}`);
        });

        // 4. Tester la récupération des données assemblées pour une session
        if (sessions.length > 0) {
            const testSessionId = sessions[0].id;
            console.log(`\n🧪 TEST: Récupération des données assemblées pour la session ${testSessionId.substring(0, 8)}...`);

            const sessionSeries = await prisma.numberSeries.findMany({
                where: { sessionId: testSessionId },
                orderBy: { createdAt: 'asc' }
            });

            const allNumbers: number[] = [];
            for (const s of sessionSeries) {
                const numbers = JSON.parse(s.numbers) as number[];
                allNumbers.push(...numbers);
            }

            console.log(`  Total series for this session: ${sessionSeries.length}`);
            console.log(`  Total numbers assembled: ${allNumbers.length}`);
            if (allNumbers.length > 0) {
                console.log(`  First 10: ${allNumbers.slice(0, 10).join(', ')}`);
                console.log(`  Last 10: ${allNumbers.slice(-10).join(', ')}`);
            }
        }

        console.log('\n✅ Vérification terminée !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
