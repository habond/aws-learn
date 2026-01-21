# Lesson 9: AI/ML Buzzwords (Get Your MBA!) 🤖

**Time**: ~6 hours | **Cost**: ~$5-10 (AI services can add up!)

## What You're Building

Build an AI-powered content moderation system that analyzes uploaded images and text. Use Amazon Rekognition for image analysis (detect inappropriate content, celebrities, text in images), Bedrock for text analysis with Claude, and store results in DynamoDB. Real-world use case: Social media moderation, content filtering, automated tagging.

## What You'll Learn

- **Amazon Rekognition**: Computer vision (image analysis)
- **Amazon Bedrock**: Access foundation models (Claude, etc)
- **Amazon Translate**: Language translation
- **Amazon Comprehend**: Natural language processing
- **AI/ML Integration**: Add AI to applications
- **Prompt Engineering**: Get better AI responses

## Prerequisites

- [ ] Completed Lessons 1-8
- [ ] AWS CLI configured
- [ ] Understanding of APIs

---

## Part 1: Image Analysis with Rekognition (2 hours)

### Step 1: Create S3 Bucket for Images

```bash
export IMAGE_BUCKET="ai-content-moderation-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$IMAGE_BUCKET

echo "Image Bucket: $IMAGE_BUCKET"
```

### Step 2: Upload Test Images

```bash
# Download sample images (or use your own)
curl -o test-image.jpg https://images.unsplash.com/photo-1552053831-71594a27632d

# Upload to S3
aws s3 cp test-image.jpg s3://$IMAGE_BUCKET/test-image.jpg
```

### Step 3: Test Rekognition APIs

```bash
# Detect labels (objects, scenes, activities)
aws rekognition detect-labels \
  --image "S3Object={Bucket=$IMAGE_BUCKET,Name=test-image.jpg}" \
  --max-labels 10

# Detect faces
aws rekognition detect-faces \
  --image "S3Object={Bucket=$IMAGE_BUCKET,Name=test-image.jpg}" \
  --attributes ALL

# Detect text in image
aws rekognition detect-text \
  --image "S3Object={Bucket=$IMAGE_BUCKET,Name=test-image.jpg}"

# Detect moderation labels (inappropriate content)
aws rekognition detect-moderation-labels \
  --image "S3Object={Bucket=$IMAGE_BUCKET,Name=test-image.jpg}"

# Detect celebrities (if any)
aws rekognition recognize-celebrities \
  --image "S3Object={Bucket=$IMAGE_BUCKET,Name=test-image.jpg}"
```

### Step 4: Create Image Analysis Lambda

Create `image-analyzer/index.js`:

```javascript
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
```

### Step 5: Create DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name content-analysis \
  --attribute-definitions AttributeName=imageKey,AttributeType=S \
  --key-schema AttributeName=imageKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws dynamodb wait table-exists --table-name content-analysis
```

### Step 6: Deploy Image Analyzer Lambda

```bash
cd image-analyzer
npm init -y
npm install @aws-sdk/client-rekognition @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
zip -r function.zip .

# Create IAM role with Rekognition, S3, DynamoDB permissions
# (create or reuse role with appropriate permissions)

aws lambda create-function \
  --function-name image-content-analyzer \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment "Variables={TABLE_NAME=content-analysis}"

# Add S3 trigger
aws lambda add-permission \
  --function-name image-content-analyzer \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::$IMAGE_BUCKET

# Configure S3 notification
cat > s3-notification.json << EOF
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "$(aws lambda get-function --function-name image-content-analyzer --query 'Configuration.FunctionArn' --output text)",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".jpg"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket $IMAGE_BUCKET \
  --notification-configuration file://s3-notification.json
```

### Step 7: Test Image Analysis

```bash
# Upload an image
aws s3 cp test-image.jpg s3://$IMAGE_BUCKET/uploads/test-$(date +%s).jpg

# Check logs
sleep 10
aws logs tail /aws/lambda/image-content-analyzer --follow

# Query DynamoDB
aws dynamodb scan --table-name content-analysis
```

---

## Part 2: Text Analysis with Bedrock (2 hours)

### Step 8: Enable Bedrock Model Access

```bash
# Note: Bedrock requires manual model access approval in console
# Go to: AWS Console → Bedrock → Model access → Request access
# Request access to: Claude 3 Haiku (cheapest/fastest)

# Check model access (will show empty until approved)
aws bedrock list-foundation-models
```

### Step 9: Test Bedrock with Claude

Create `test-bedrock.py`:

```python
import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def analyze_text(text):
    prompt = f"""Analyze the following text for:
1. Sentiment (positive/negative/neutral)
2. Language tone (formal/casual/aggressive/friendly)
3. Any concerning content (hate speech, violence, explicit content)
4. Key topics/themes

Text: {text}

Provide your analysis in JSON format."""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })

    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=body
    )

    response_body = json.loads(response['body'].read())
    return response_body['content'][0]['text']

if __name__ == '__main__':
    test_text = "I love this product! It's absolutely amazing and works perfectly."

    analysis = analyze_text(test_text)
    print("Analysis:", analysis)
```

Run test:

```bash
python3 test-bedrock.py
```

### Step 10: Create Text Analysis Lambda

Create `text-analyzer/index.js`:

```javascript
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

async function analyzeWithClaude(text) {
  const prompt = `Analyze this text for sentiment, tone, and any concerning content. Respond in JSON format with: sentiment (positive/negative/neutral), tone (formal/casual/aggressive/friendly), isSafe (boolean), concerns (array of strings).

Text: ${text}`;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    body: body,
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return JSON.parse(responseBody.content[0].text);
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  const body = JSON.parse(event.body);
  const text = body.text;
  const id = body.id || Date.now().toString();

  try {
    const analysis = await analyzeWithClaude(text);

    const result = {
      id: id,
      text: text,
      analyzedAt: new Date().toISOString(),
      ...analysis,
      status: analysis.isSafe ? 'APPROVED' : 'FLAGGED'
    };

    // Store in DynamoDB
    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: result
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

Deploy:

```bash
cd text-analyzer
npm init -y
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
zip -r function.zip .

# Create table for text analysis
aws dynamodb create-table \
  --table-name text-analysis \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws lambda create-function \
  --function-name text-content-analyzer \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={TABLE_NAME=text-analysis}"
```

### Step 11: Create API and Test

```bash
# Create API Gateway (HTTP API)
aws apigatewayv2 create-api \
  --name content-moderation-api \
  --protocol-type HTTP \
  --target $(aws lambda get-function --function-name text-content-analyzer --query 'Configuration.FunctionArn' --output text)

export API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='content-moderation-api'].ApiId" --output text)

aws lambda add-permission \
  --function-name text-content-analyzer \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*"

export API_ENDPOINT=$(aws apigatewayv2 get-apis --query "Items[?Name=='content-moderation-api'].ApiEndpoint" --output text)

echo "API Endpoint: $API_ENDPOINT"

# Test text analysis
curl -X POST $API_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a wonderful day! I love learning about AWS."
  }'
```

---

## Part 3: Additional AI Services (1 hour)

### Step 12: Test Comprehend (NLP)

```bash
# Detect sentiment
aws comprehend detect-sentiment \
  --text "I love this service! It's amazing!" \
  --language-code en

# Detect entities
aws comprehend detect-entities \
  --text "Amazon Web Services is based in Seattle, Washington" \
  --language-code en

# Detect key phrases
aws comprehend detect-key-phrases \
  --text "AWS provides many AI and ML services for developers" \
  --language-code en
```

### Step 13: Test Translate

```bash
# Translate to Spanish
aws translate translate-text \
  --text "Hello, how are you?" \
  --source-language-code en \
  --target-language-code es

# Translate to French
aws translate translate-text \
  --text "AWS is awesome for machine learning" \
  --source-language-code en \
  --target-language-code fr
```

---

## Challenges (Optional)

### Easy
- [ ] Add more Rekognition features (celebrity detection)
- [ ] Create dashboard showing analysis results
- [ ] Add email notifications for flagged content

### Medium
- [ ] Build custom image classification model with SageMaker
- [ ] Add multi-language support with Translate
- [ ] Create moderation workflow with human review
- [ ] Implement custom vocabulary for Comprehend

### Hard
- [ ] Train custom Rekognition model
- [ ] Build recommendation engine
- [ ] Implement fine-tuned Bedrock model
- [ ] Create A/B testing for different AI models

---

## Troubleshooting

**Bedrock access denied?**
- Request model access in console
- Wait for approval (can take minutes to hours)
- Check region (not all regions support all models)

**Rekognition errors?**
- Verify image is in S3
- Check IAM permissions
- Ensure image format is supported (JPEG, PNG)

**High costs?**
- Bedrock charges per token
- Rekognition charges per image
- Monitor usage in Cost Explorer
- Set billing alerts!

---

## Cleanup

```bash
# Delete API
aws apigatewayv2 delete-api --api-id $API_ID

# Delete Lambda functions
aws lambda delete-function --function-name image-content-analyzer
aws lambda delete-function --function-name text-content-analyzer

# Delete DynamoDB tables
aws dynamodb delete-table --table-name content-analysis
aws dynamodb delete-table --table-name text-analysis

# Empty and delete S3 bucket
aws s3 rm s3://$IMAGE_BUCKET --recursive
aws s3 rb s3://$IMAGE_BUCKET
```

---

## What You Learned

- ✅ Analyzed images with Rekognition
- ✅ Used foundation models with Bedrock
- ✅ Processed natural language with Comprehend
- ✅ Translated text with Translate
- ✅ Built AI-powered applications
- ✅ Understood prompt engineering
- ✅ Integrated multiple AI services

---

## AI/ML Services Comparison

### Use Rekognition when:
- Computer vision tasks
- Pre-trained models sufficient
- Quick implementation needed

### Use Bedrock when:
- Need latest LLMs
- Complex text understanding
- Conversational AI

### Use SageMaker when:
- Custom model training
- Full ML workflow control
- Advanced ML engineering

---

## Next Steps

Head to [Lesson 10: Observability](../lesson-10-observability/) to learn advanced monitoring, tracing, and debugging with CloudWatch, X-Ray, and Grafana! 🔍
