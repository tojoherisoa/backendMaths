// Test script to simulate adding three series to the database
// Run this with: node testSeriesImport.js

const testData = {
    series1: [3.97, 1.88, 2.07, 1.62, 7.73, 1.76, 2.20, 2.44, 4.48, 1.87, 1.60, 2.95, 2.48, 1.15, 1.64, 1.21, 6.67, 4.36, 11.30, 28.27],
    series2: [9.17, 1.30, 2.52, 1.60, 1.72, 15.07, 93.96, 1.55, 1.22, 1.26, 1.35, 12.88, 1.31, 1.18, 4.56, 1.72, 1.94, 1.88, 3.44, 1.69],
    series3: [1.45, 1.72, 2.52, 1.18, 1.65, 1.02, 1.71, 1.02, 3.18, 1.28, 2.53, 2.42, 1.07, 2.99, 3.24, 1.78, 2.23, 6.37, 1.05, 3.20]
};

async function testSeriesImport() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // 1. Create a test session
    console.log('Creating test session...');
    const sessionResponse = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: 'Test User', mode: 'EDUCATION' })
    });

    const { id: sessionId } = await sessionResponse.json();
    console.log('Session created:', sessionId);

    // 2. Import series 1
    console.log('\n--- Importing Series 1 (HTML) ---');
    const series1Response = await fetch(`${API_URL}/api/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            numbers: testData.series1,
            source: 'HTML'
        })
    });
    const series1Result = await series1Response.json();
    console.log('Series 1 saved:', series1Result);

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Import series 2
    console.log('\n--- Importing Series 2 (HTML) ---');
    const series2Response = await fetch(`${API_URL}/api/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            numbers: testData.series2,
            source: 'HTML'
        })
    });
    const series2Result = await series2Response.json();
    console.log('Series 2 saved:', series2Result);

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Import series 3
    console.log('\n--- Importing Series 3 (HTML) ---');
    const series3Response = await fetch(`${API_URL}/api/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            numbers: testData.series3,
            source: 'HTML'
        })
    });
    const series3Result = await series3Response.json();
    console.log('Series 3 saved:', series3Result);

    // 5. Fetch all assembled data
    console.log('\n--- Fetching Assembled Data ---');
    const assembledResponse = await fetch(`${API_URL}/api/series/${sessionId}/all`);
    const assembledData = await assembledResponse.json();
    console.log('Total numbers assembled:', assembledData.count);
    console.log('First 10 numbers:', assembledData.numbers.slice(0, 10));
    console.log('Last 10 numbers:', assembledData.numbers.slice(-10));

    // 6. Fetch series history
    console.log('\n--- Fetching Series History ---');
    const historyResponse = await fetch(`${API_URL}/api/series/${sessionId}?page=1&limit=10`);
    const historyData = await historyResponse.json();
    console.log('Total series:', historyData.total);
    console.log('Series list:');
    historyData.series.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.source} - ${s.count} numbers - ${new Date(s.createdAt).toLocaleString()}`);
    });

    console.log('\n✅ Test completed! Session ID:', sessionId);
    console.log('You can use this session ID in the frontend to view the data.');
}

// Run the test
testSeriesImport().catch(console.error);
