const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const shortCode = event.pathParameters?.shortCode;

  if (!shortCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Short code is required' })
    };
  }

  try {
    // Get URL from DynamoDB
    const result = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME || 'url-shortener',
      Key: { shortCode }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Short URL not found' })
      };
    }

    // Increment click counter
    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME || 'url-shortener',
      Key: { shortCode },
      UpdateExpression: 'SET clicks = clicks + :inc',
      ExpressionAttributeValues: { ':inc': 1 }
    }));

    // Redirect
    return {
      statusCode: 301,
      headers: {
        'Location': result.Item.originalUrl
      }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
