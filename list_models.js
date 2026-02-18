const https = require('https');

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.error('GOOGLE_GEMINI_API_KEY is not set');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                });
            } else {
                console.log('Error or empty models list:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.log('Raw Data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Request error:', err.message);
});
