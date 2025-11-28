interface PredictionResult {
    nextValues: number[];
    confidence: number;
    isDeterministic: boolean;
    type: 'ARITHMETIC' | 'GEOMETRIC' | 'RANDOM';
    interval?: { min: number, max: number };
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
        const logData = dataPoints.map(([x, y]) => [x, y > 0 ? Math.log(y) : 0]);
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

        // 3. ANALYSE STATISTIQUE (HASARD)
        const mean = history.reduce((a, b) => a + b, 0) / n;
        const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const margin = 2.576 * stdDev;

        return {
            nextValues: [mean, mean, mean],
            confidence: 0.1,
            isDeterministic: false,
            type: 'RANDOM',
            interval: { min: mean - margin, max: mean + margin }
        };
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

function calculateR2(data: number[][], predictFn: (x: number) => number) {
    const meanY = data.reduce((sum, [, y]) => sum + y, 0) / data.length;
    const ssTot = data.reduce((sum, [, y]) => sum + Math.pow(y - meanY, 2), 0);
    const ssRes = data.reduce((sum, [x, y]) => sum + Math.pow(y - predictFn(x), 2), 0);
    return 1 - (ssRes / ssTot);
}
