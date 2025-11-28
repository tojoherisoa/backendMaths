interface PredictionResult {
    nextValues: number[];
    confidence: number;
    isDeterministic: boolean;
    type: 'ARITHMETIC' | 'GEOMETRIC' | 'QUADRATIC' | 'FIBONACCI' | 'RANDOM';
    interval?: { min: number, max: number };
    warning?: string;
    monteCarlo?: string;
    peakAnalysis?: { probability: number, text: string };
    recommendation?: { action: 'GO' | 'STOP', confidence: number, reason: string };
    calmAnalysis?: {
        turn1: { isCalm: boolean, probability: number };
        turn2: { isCalm: boolean, probability: number };
        globalProbability: number;
    };
}

export class SequenceAnalyzer {
    predict(history: number[]): PredictionResult {
        const n = history.length;
        if (n < 3) throw new Error("Pas assez de données");

        const dataPoints = history.map((y, x) => [x, y]);

        // 1. TEST ARITHMÉTIQUE (Linéaire)
        const linModel = linearRegression(dataPoints);
        const linR2 = calculateR2(dataPoints, (x) => linModel.m * x + linModel.b);

        if (linR2 > 0.98) {
            return {
                nextValues: [1, 2, 3].map(i => parseFloat((linModel.m * (n - 1 + i) + linModel.b).toFixed(2))),
                confidence: linR2,
                isDeterministic: true,
                type: 'ARITHMETIC'
            };
        }

        // 2. TEST GÉOMÉTRIQUE (Exponentiel)
        // Only if all values are positive
        const hasNonPositive = history.some(y => y <= 0);
        if (!hasNonPositive) {
            const logData = dataPoints.map(([x, y]) => [x, Math.log(y)]);
            const geoModel = linearRegression(logData);
            const geoR2 = calculateR2(logData, (x) => geoModel.m * x + geoModel.b);

            if (geoR2 > 0.95) {
                return {
                    nextValues: [1, 2, 3].map(i => {
                        const logVal = geoModel.m * (n - 1 + i) + geoModel.b;
                        return parseFloat(Math.exp(logVal).toFixed(2));
                    }),
                    confidence: geoR2,
                    isDeterministic: true,
                    type: 'GEOMETRIC'
                };
            }
        }

        // 3. TEST QUADRATIQUE (Polynomial degree 2)
        const quadModel = quadraticRegression(dataPoints);
        const quadR2 = calculateR2(dataPoints, (x) => quadModel.a * x * x + quadModel.b * x + quadModel.c);

        if (quadR2 > 0.98) {
            return {
                nextValues: [1, 2, 3].map(i => {
                    const x = n - 1 + i;
                    return parseFloat((quadModel.a * x * x + quadModel.b * x + quadModel.c).toFixed(2));
                }),
                confidence: quadR2,
                isDeterministic: true,
                type: 'QUADRATIC'
            };
        }

        // 4. TEST FIBONACCI
        let fibMatch = true;
        if (n >= 3) {
            for (let i = 2; i < n; i++) {
                if (Math.abs(history[i] - (history[i - 1] + history[i - 2])) > 0.1) {
                    fibMatch = false;
                    break;
                }
            }
        } else {
            fibMatch = false;
        }

        if (fibMatch) {
            const last = history[n - 1];
            const secondLast = history[n - 2];
            const next1 = last + secondLast;
            const next2 = next1 + last;
            const next3 = next2 + next1;
            return {
                nextValues: [next1, next2, next3],
                confidence: 1.0,
                isDeterministic: true,
                type: 'FIBONACCI'
            };
        }

        // 5. ANALYSE STATISTIQUE ROBUSTE (HASARD)
        const robustStats = this.calculateRobustStatistics(history);

        // Ajout de la simulation Monte Carlo pour la zone "Calme" (2.0 - 3.0)
        robustStats.monteCarlo = this.runMonteCarloSimulation(history, 2.0, 3.0);

        // Ajout de l'analyse de Pic (> 10.0)
        robustStats.peakAnalysis = this.calculatePeakProbability(history);

        // Ajout de la recommandation GO/STOP (>= 3.0 dans les 2 prochains tours)
        robustStats.recommendation = this.generateRecommendation(history);

        // Ajout de l'analyse de Zone Calme (2 tours)
        robustStats.calmAnalysis = this.analyzeCalmZone(history);

        return robustStats;
    }

    /**
     * Analyse la probabilité de "Zone Calme" (< 3.0) pour les 2 prochains tours
     */
    public analyzeCalmZone(history: number[]): {
        turn1: { isCalm: boolean, probability: number };
        turn2: { isCalm: boolean, probability: number };
        globalProbability: number;
    } {
        const threshold = 3.0; // Seuil de calme
        const simulations = 5000;
        const pool = history.slice(-50);

        if (pool.length === 0) {
            return {
                turn1: { isCalm: false, probability: 0 },
                turn2: { isCalm: false, probability: 0 },
                globalProbability: 0
            };
        }

        let t1CalmCount = 0;
        let t2CalmCount = 0;
        let bothCalmCount = 0;

        for (let i = 0; i < simulations; i++) {
            const val1 = pool[Math.floor(Math.random() * pool.length)];
            const val2 = pool[Math.floor(Math.random() * pool.length)];

            const t1Calm = val1 < threshold;
            const t2Calm = val2 < threshold;

            if (t1Calm) t1CalmCount++;
            if (t2Calm) t2CalmCount++;
            if (t1Calm && t2Calm) bothCalmCount++;
        }

        const p1 = (t1CalmCount / simulations) * 100;
        const p2 = (t2CalmCount / simulations) * 100;
        const pGlobal = (bothCalmCount / simulations) * 100;

        return {
            turn1: { isCalm: p1 > 60, probability: parseFloat(p1.toFixed(1)) },
            turn2: { isCalm: p2 > 60, probability: parseFloat(p2.toFixed(1)) },
            globalProbability: parseFloat(pGlobal.toFixed(1))
        };
    }

    /**
     * Analyse la probabilité d'un événement rare (Pic > 10x) au prochain tour
     */
    public calculatePeakProbability(history: number[]): { probability: number, text: string } {
        const threshold = 10.0;
        const n = history.length;

        // 1. Trouver les indices des pics
        const peakIndices = history.map((val, idx) => val >= threshold ? idx : -1).filter(idx => idx !== -1);

        if (peakIndices.length < 2) {
            return { probability: 5, text: "Pas assez d'historique de pics pour prédire." };
        }

        // 2. Calculer les écarts (Gaps) entre les pics
        let gaps: number[] = [];
        for (let i = 1; i < peakIndices.length; i++) {
            gaps.push(peakIndices[i] - peakIndices[i - 1]);
        }

        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const lastPeakIndex = peakIndices[peakIndices.length - 1];
        const currentGap = (n - 1) - lastPeakIndex;

        // 3. Facteur de tension temporelle (Z-Score du temps)
        // Plus on dépasse l'écart moyen, plus la probabilité monte (Mean Reversion des délais)
        let timeFactor = currentGap / avgGap;

        // Si timeFactor > 2.0 (ça fait 2x plus longtemps que d'habitude), proba max
        // On normalise en pourcentage (Clamped 0-100)
        // BOOST: On rend la courbe plus agressive
        let probability = Math.min(Math.max((timeFactor - 0.4) * 60, 0), 98);

        // 4. Ajustement Kurtosis / Compression Locale
        // Si on a eu beaucoup de petits chiffres récemment, la pression monte (Loi de compensation locale)
        const recentHistory = history.slice(-10);
        const lowVals = recentHistory.filter(x => x < 2.0).length;

        if (lowVals >= 8) probability += 15; // Gros bonus si compression forte (8/10 < 2.0)

        // BOOST: Si les 5 derniers sont TOUS < 2.0, c'est une "Dead Zone" qui précède souvent un pic
        const last5 = history.slice(-5);
        if (last5.every(x => x < 2.0)) probability += 10;

        // Cap final à 99%
        probability = Math.min(probability, 99);

        let text = `Dernier pic il y a ${currentGap} tours (Moyenne: ${avgGap.toFixed(1)}).`;

        if (probability > 85) text += " ⚠️ PIC IMMINENT (Gap critique + Compression).";
        else if (probability > 60) text += " Zone très propice à un pic.";
        else if (probability > 40) text += " Accumulation en cours.";
        else text += " Patience.";

        return { probability: parseFloat(probability.toFixed(1)), text };
    }

    /**
     * Génère une recommandation GO/STOP pour un pic >= 3.0 dans les 2 prochains tours
     */
    private generateRecommendation(history: number[]): { action: 'GO' | 'STOP', confidence: number, reason: string } {
        const threshold = 3.0;
        const horizon = 2;

        // 1. Probabilité Monte Carlo
        const mcProb = this.getMonteCarloProbability(history, threshold, Infinity, horizon); // Use Infinity for max if only min is relevant

        // 2. Analyse des Gaps pour >= 3.0
        const peakIndices = history.map((val, idx) => val >= threshold ? idx : -1).filter(idx => idx !== -1);
        let gapSignal = false;
        let gapReason = "";

        if (peakIndices.length >= 2) {
            let gaps: number[] = [];
            for (let i = 1; i < peakIndices.length; i++) {
                gaps.push(peakIndices[i] - peakIndices[i - 1]);
            }
            const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            const lastPeakIndex = peakIndices[peakIndices.length - 1];
            const currentGap = (history.length - 1) - lastPeakIndex;

            if (currentGap > avgGap) {
                gapSignal = true;
                gapReason = `Retard statistique (Gap ${currentGap} > Moy ${avgGap.toFixed(1)})`;
            }
        }

        // 3. Décision
        // Si proba MC > 30% (c'est déjà bien pour un x3) OU (MC > 20% ET GapSignal)
        if (mcProb > 30 || (mcProb > 20 && gapSignal)) {
            return {
                action: 'GO',
                confidence: parseFloat(mcProb.toFixed(1)),
                reason: `Probabilité ${mcProb.toFixed(1)}% sur ${horizon} tours. ${gapReason}`
            };
        } else {
            return {
                action: 'STOP',
                confidence: parseFloat((100 - mcProb).toFixed(1)),
                reason: `Probabilité faible (${mcProb.toFixed(1)}%). Attendre.`
            };
        }
    }

    private getMonteCarloProbability(history: number[], min: number, max: number, horizon: number): number {
        const simulations = 5000;
        let successCount = 0;
        const pool = history.slice(-50);
        if (pool.length === 0) return 0;

        for (let i = 0; i < simulations; i++) {
            for (let turn = 1; turn <= horizon; turn++) {
                const simulatedValue = pool[Math.floor(Math.random() * pool.length)];
                if (simulatedValue >= min && simulatedValue <= max) {
                    successCount++;
                    break;
                }
            }
        }
        return (successCount / simulations) * 100;
    }

    /**
     * Simule l'avenir basé sur la densité de probabilité historique (Kernel Density Estimation simplifié)
     */
    public runMonteCarloSimulation(history: number[], targetMin: number, targetMax: number): string {
        const simulations = 5000;
        const horizon = 5;
        let successCount = 0;
        let averageTurn = 0;
        const pool = history.slice(-50);

        if (pool.length === 0) return "Pas assez de données pour simuler.";

        for (let i = 0; i < simulations; i++) {
            for (let turn = 1; turn <= horizon; turn++) {
                const simulatedValue = pool[Math.floor(Math.random() * pool.length)];
                if (simulatedValue >= targetMin && simulatedValue <= targetMax) {
                    successCount++;
                    averageTurn += turn;
                    break;
                }
            }
        }

        const probability = (successCount / simulations) * 100;
        const estimatedTurn = successCount > 0 ? (averageTurn / successCount) : 0;

        if (probability < 20) return `Probabilité faible (${probability.toFixed(1)}%) d'ici 5 tours.`;

        return `D'après ${simulations} simulations :
        - Probabilité de la zone [${targetMin}-${targetMax}] : ${probability.toFixed(1)}%
        - Estimé au tour n° : +${estimatedTurn.toFixed(1)} (environ)`;
    }

    private calculateRobustStatistics(history: number[]): PredictionResult {
        const n = history.length;

        // 1. Tri pour médiane et quartiles
        const sorted = [...history].sort((a, b) => a - b);
        const median = sorted[Math.floor(n * 0.5)];
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;

        // 2. EMA (Tendance court terme sur les 10 derniers points)
        const k = 2 / (Math.min(n, 10) + 1);
        let ema = history[0];
        for (let i = 1; i < history.length; i++) {
            ema = history[i] * k + ema * (1 - k);
        }

        // 3. Analyse RSI & Volatilité (State Machine)
        const { rsi, state } = this.calculateVolatilityState(history);

        // 4. Matrice de Transition (Markov Simplifié)
        // États: LOW (< 2.0), MED (2.0 - 10.0), HIGH (> 10.0)
        const getLastState = (val: number) => val < 2.0 ? 'LOW' : (val <= 10.0 ? 'MED' : 'HIGH');
        const lastVal = history[n - 1];
        const currentState = getLastState(lastVal);

        // Calcul des probabilités de transition depuis l'état actuel
        let transitionCounts = { LOW: 0, MED: 0, HIGH: 0, total: 0 };
        for (let i = 0; i < n - 1; i++) {
            if (getLastState(history[i]) === currentState) {
                const nextState = getLastState(history[i + 1]);
                transitionCounts[nextState]++;
                transitionCounts.total++;
            }
        }

        // 5. Logique de Décision Combinée
        let safePrediction = Math.min(median, ema);
        let minInterval = Math.max(0, q1 - 0.5 * iqr);
        let maxInterval = q3 + 1.5 * iqr;
        let warning: string | undefined = undefined;

        // Ajustement basé sur le RSI (Chaud/Froid)
        if (state === 'HOT') {
            // Surchauffe -> Correction probable vers le bas
            safePrediction = safePrediction * 0.8;
            warning = `Surchauffe (RSI ${rsi.toFixed(0)}). Correction probable.`;
        } else if (state === 'COLD') {
            // Compression -> Risque d'explosion vers le haut
            maxInterval = q3 * 3; // On élargit grandement l'intervalle haut
            warning = `Compression (RSI ${rsi.toFixed(0)}). Pic de volatilité possible.`;
        } else {
            // État Neutre - Vérification "SafetyScore" classique
            const lowValueCount = history.filter(v => v < 2.0).length;
            if (lowValueCount / n > 0.5) {
                warning = "Risque Élevé : Majorité de petits chiffres (< 2.00)";
            }
        }

        // Ajustement basé sur Markov (Si probabilité de chute forte)
        if (transitionCounts.total > 0) {
            const probToLow = transitionCounts.LOW / transitionCounts.total;
            if (currentState === 'HIGH' && probToLow > 0.7) {
                safePrediction = Math.min(safePrediction, 1.5); // Force une prédiction basse
                warning = (warning ? warning + " " : "") + "Cycle High -> Low imminent.";
            }
        }

        return {
            nextValues: [safePrediction, safePrediction, safePrediction].map(v => parseFloat(v.toFixed(2))),
            confidence: state === 'NEUTRAL' ? 0.15 : 0.25, // Un peu plus confiant si on détecte un état extrême
            isDeterministic: false,
            type: 'RANDOM',
            interval: { min: minInterval, max: maxInterval },
            warning
        };
    }

    private calculateVolatilityState(history: number[]): { rsi: number, state: 'COLD' | 'NEUTRAL' | 'HOT' } {
        const recent = history.slice(-14);
        if (recent.length < 2) return { rsi: 50, state: 'NEUTRAL' };

        let gains = 0;
        let losses = 0;

        for (let i = 1; i < recent.length; i++) {
            const diff = recent[i] - recent[i - 1];
            if (diff > 0) gains += diff;
            else losses -= diff; // Valeur absolue
        }

        if (losses === 0) return { rsi: 100, state: 'HOT' };

        const rs = gains / losses;
        const rsi = 100 - (100 / (1 + rs));

        let state: 'COLD' | 'NEUTRAL' | 'HOT' = 'NEUTRAL';
        if (rsi > 70) state = 'HOT'; // Trop de montées récentes
        if (rsi < 30) state = 'COLD'; // Trop de descentes récentes

        return { rsi, state };
    }
}

function linearRegression(data: number[][]) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const [x, y] of data) {
        sumX += x; sumY += y;
        sumXY += x * y; sumXX += x * x;
    }
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    return { m, b };
}

function quadraticRegression(data: number[][]) {
    const n = data.length;
    let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
    let sy = 0, sxy = 0, sx2y = 0;

    for (const [x, y] of data) {
        const x2 = x * x;
        const x3 = x2 * x;
        const x4 = x3 * x;

        sx += x;
        sx2 += x2;
        sx3 += x3;
        sx4 += x4;
        sy += y;
        sxy += x * y;
        sx2y += x2 * y;
    }

    const A = [
        [sx4, sx3, sx2],
        [sx3, sx2, sx],
        [sx2, sx, n]
    ];
    const B = [sx2y, sxy, sy];

    return solve3x3(A, B);
}

function solve3x3(A: number[][], B: number[]) {
    const det = (m: number[][]) =>
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    const D = det(A);
    if (Math.abs(D) < 1e-9) return { a: 0, b: 0, c: 0 };

    const Da = det([
        [B[0], A[0][1], A[0][2]],
        [B[1], A[1][1], A[1][2]],
        [B[2], A[2][1], A[2][2]]
    ]);
    const Db = det([
        [A[0][0], B[0], A[0][2]],
        [A[1][0], B[1], A[1][2]],
        [A[2][0], B[2], A[2][2]]
    ]);
    const Dc = det([
        [A[0][0], A[0][1], B[0]],
        [A[1][0], A[1][1], B[1]],
        [A[2][0], A[2][1], B[2]]
    ]);

    return { a: Da / D, b: Db / D, c: Dc / D };
}

function calculateR2(data: number[][], predictFn: (x: number) => number) {
    const meanY = data.reduce((sum, [, y]) => sum + y, 0) / data.length;
    const ssTot = data.reduce((sum, [, y]) => sum + Math.pow(y - meanY, 2), 0);
    const ssRes = data.reduce((sum, [x, y]) => sum + Math.pow(y - predictFn(x), 2), 0);
    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
}
