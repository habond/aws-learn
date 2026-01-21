// Simple JavaScript to test that JS files are being served correctly from S3/CloudFront

// Set the deploy date
document.addEventListener('DOMContentLoaded', function() {
    const deployDateElement = document.getElementById('deployDate');
    if (deployDateElement) {
        deployDateElement.textContent = new Date().toLocaleDateString();
    }

    // Button click handler
    const button = document.getElementById('clickMe');
    const message = document.getElementById('message');

    if (button && message) {
        let clickCount = 0;

        button.addEventListener('click', function() {
            clickCount++;

            const messages = [
                '🎉 JavaScript works! CloudFront is serving this file correctly!',
                '⚡ This loaded from an edge location near you!',
                '🚀 AWS is pretty cool, right?',
                `💪 You've clicked ${clickCount} times. You're really testing this!`,
                '🎯 Keep learning AWS!',
                '☁️ The cloud is just someone else\'s computer... but faster!',
                '🔥 You\'re doing great!',
                '✨ Next up: serverless functions!',
                `🤖 Click count: ${clickCount}. This state won't persist because it's static!`,
                '🌍 This site is being served from multiple continents!'
            ];

            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            message.textContent = randomMessage;

            // Add some visual flair
            message.style.color = getRandomColor();
        });
    }
});

// Generate random bright colors
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Log to console so you can see this in DevTools
console.log('🚀 AWS Lesson 1 - JavaScript loaded successfully!');
console.log('📊 Check the Network tab to see this file being served from CloudFront');
console.log('💡 Look for the "x-cache" header to see if it\'s a cache hit or miss');
