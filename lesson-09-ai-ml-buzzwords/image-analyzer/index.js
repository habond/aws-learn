const { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand, DetectTextCommand, DetectFacesCommand } = require('@aws-sdk/client-rekognition');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const rekognition = new RekognitionClient({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  console.log(`Analyzing image: s3://${bucket}/${key}`);

  try {
    // Detect labels
    const labelsResponse = await rekognition.send(new DetectLabelsCommand({
      Image: { S3Object: { Bucket: bucket, Name: key } },
      MaxLabels: 10
    }));

    // Detect moderation labels
    const moderationResponse = await rekognition.send(new DetectModerationLabelsCommand({
      Image: { S3Object: { Bucket: bucket, Name: key } }
    }));

    // Detect text
    const textResponse = await rekognition.send(new DetectTextCommand({
      Image: { S3Object: { Bucket: bucket, Name: key } }
    }));

    // Detect faces
    const facesResponse = await rekognition.send(new DetectFacesCommand({
      Image: { S3Object: { Bucket: bucket, Name: key } },
      Attributes: ['ALL']
    }));

    // Determine if content is safe
    const isSafe = moderationResponse.ModerationLabels.length === 0 ||
                   moderationResponse.ModerationLabels.every(label => label.Confidence < 80);

    const analysis = {
      imageKey: key,
      bucket: bucket,
      analyzedAt: new Date().toISOString(),
      labels: labelsResponse.Labels.map(l => ({ name: l.Name, confidence: l.Confidence })),
      moderationLabels: moderationResponse.ModerationLabels.map(l => ({ name: l.Name, confidence: l.Confidence })),
      textDetected: textResponse.TextDetections.map(t => t.DetectedText),
      faceCount: facesResponse.FaceDetails.length,
      isSafe: isSafe,
      status: isSafe ? 'APPROVED' : 'FLAGGED'
    };

    // Store results in DynamoDB
    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: analysis
    }));

    console.log('Analysis complete:', analysis);

    return {
      statusCode: 200,
      body: JSON.stringify(analysis)
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
