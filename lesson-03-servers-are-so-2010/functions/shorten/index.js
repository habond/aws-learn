const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body);
    const { url, customCode } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    const shortCode = customCode || generateShortCode();

    const item = {
      shortCode,
      originalUrl: url,
      createdAt: Date.now(),
      clicks: 0
    };

    await ddb.send(new PutCommand({
      TableName: 'url-shortener',
      Item: item,
      ConditionExpression: 'attribute_not_exists(shortCode)'
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortCode,
        shortUrl: `https://your-api.com/${shortCode}`,
        originalUrl: url
      })
    };
  } catch (error) {
    console.error('Error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Short code already exists' })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
