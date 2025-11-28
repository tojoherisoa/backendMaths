import { prisma } from './src/lib/prisma';

async function cleanDatabase() {
    console.log('🧹 Nettoyage de la base de données en cours...\n');

    try {
        // 1. Supprimer les logs de prédiction
        const deletedLogs = await prisma.predictionLog.deleteMany({});
        console.log(`✅ Supprimé ${deletedLogs.count} logs de prédiction.`);

        // 2. Supprimer les séquences de nombres (prédictions)
        const deletedSequences = await prisma.numberSequence.deleteMany({});
        console.log(`✅ Supprimé ${deletedSequences.count} séquences de nombres.`);

        // 3. Supprimer les séries de nombres (imports)
        const deletedSeries = await prisma.numberSeries.deleteMany({});
        console.log(`✅ Supprimé ${deletedSeries.count} séries de nombres.`);

        // 4. Supprimer les sessions
        const deletedSessions = await prisma.session.deleteMany({});
        console.log(`✅ Supprimé ${deletedSessions.count} sessions.`);

        console.log('\n✨ Base de données nettoyée avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage :', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
