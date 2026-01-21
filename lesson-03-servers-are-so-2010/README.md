# Lesson 3: Servers Are So 2010 (Go Serverless!) ⚡

**Time**: ~6 hours | **Cost**: ~$0.50 (seriously, it's that cheap)

## What You're Building

Build a fully serverless REST API without managing a single server. You'll create a URL shortener service using Lambda functions, API Gateway, and DynamoDB. No servers to patch, no capacity planning, no SSH keys - just code that scales automatically from zero to millions of requests.

## What You'll Learn

- **Lambda**: Run code without servers
- **API Gateway**: HTTP endpoints for your functions
- **DynamoDB**: NoSQL database that scales automatically
- **IAM Roles**: Fine-grained permissions for Lambda
- **CloudWatch Logs**: Debugging serverless apps
- **Serverless architecture**: When to use it (and when not to)

## Prerequisites

- [ ] Completed Lessons 1 & 2
- [ ] AWS CLI configured
- [ ] Node.js or Python installed locally
- [ ] Text editor ready
- [ ] Comfortable with JSON

---

## What We're Building: URL Shortener API

**Endpoints**:
- `POST /shorten` - Create short URL
- `GET /{shortCode}` - Redirect to original URL
- `GET /stats/{shortCode}` - View click stats
- `DELETE /{shortCode}` - Delete short URL

**Why a URL shortener?**
- Simple enough to understand
- Complex enough to be useful
- Demonstrates CRUD operations
- Real-world use case

---

## Part 1: DynamoDB - Your Serverless Database (1 hour)

### Step 1: Create DynamoDB Table

```bash
# Create table for URL mappings
aws dynamodb create-table \
  --table-name url-shortener \
  --attribute-definitions \
    AttributeName=shortCode,AttributeType=S \
  --key-schema \
    AttributeName=shortCode,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=URLShortener

# Wait for table to be active
aws dynamodb wait table-exists --table-name url-shortener

# Verify table exists
aws dynamodb describe-table --table-name url-shortener
```

**What's happening?**
- `shortCode` is our partition key (unique identifier)
- `PAY_PER_REQUEST` means we only pay for what we use (no provisioned capacity)
- No servers, no capacity planning, instant scaling

### Step 2: Test DynamoDB

```bash
# Put an item
aws dynamodb put-item \
  --table-name url-shortener \
  --item '{
    "shortCode": {"S": "test123"},
    "originalUrl": {"S": "https://example.com"},
    "createdAt": {"N": "1234567890"},
    "clicks": {"N": "0"}
  }'

# Get the item
aws dynamodb get-item \
  --table-name url-shortener \
  --key '{"shortCode": {"S": "test123"}}'

# Scan table (see all items)
aws dynamodb scan --table-name url-shortener
```

**DynamoDB is working!** Now let's add Lambda functions.

---

## Part 2: Lambda Functions (2 hours)

### Step 3: Create Lambda Execution Role

Lambda needs permission to write logs and access DynamoDB.

```bash
# Create trust policy for Lambda
cat > lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name lambda-url-shortener-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach basic Lambda execution policy (for CloudWatch Logs)
aws iam attach-role-policy \
  --role-name lambda-url-shortener-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create DynamoDB policy
cat > lambda-dynamodb-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/url-shortener"
    }
  ]
}
EOF

# Create and attach DynamoDB policy
aws iam put-role-policy \
  --role-name lambda-url-shortener-role \
  --policy-name DynamoDBAccess \
  --policy-document file://lambda-dynamodb-policy.json

# Get role ARN (we'll need this!)
export LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name lambda-url-shortener-role \
  --query 'Role.Arn' \
  --output text)

echo "Lambda Role ARN: $LAMBDA_ROLE_ARN"
```

### Step 4: Create Shorten URL Function

Create `functions/shorten/index.js`:

```javascript
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
```

Create `functions/shorten/package.json`:

```json
{
  "name": "shorten-function",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
}
```

### Step 5: Package and Deploy Shorten Function

```bash
# Create function directory
mkdir -p functions/shorten
cd functions/shorten

# Install dependencies
npm install

# Package function
zip -r function.zip .

# Deploy to Lambda
aws lambda create-function \
  --function-name url-shorten \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 256

# Test it!
aws lambda invoke \
  --function-name url-shorten \
  --cli-binary-format raw-in-base64-out \
  --payload '{"body": "{\"url\": \"https://aws.amazon.com\"}"}' \
  response.json

cat response.json
```

**You just ran your first Lambda function!** 🎉

### Step 6: Create Redirect Function

Create `functions/redirect/index.js`:

```javascript
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
      TableName: 'url-shortener',
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
      TableName: 'url-shortener',
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
```

### Step 7: Deploy Redirect Function

```bash
cd ../redirect
# Copy package.json from shorten function
cp ../shorten/package.json .

npm install
zip -r function.zip .

aws lambda create-function \
  --function-name url-redirect \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 256
```

### Step 8: Create Stats Function

Create `functions/stats/index.js`:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const shortCode = event.pathParameters?.shortCode;

  try {
    const result = await ddb.send(new GetCommand({
      TableName: 'url-shortener',
      Key: { shortCode }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Short URL not found' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortCode: result.Item.shortCode,
        originalUrl: result.Item.originalUrl,
        clicks: result.Item.clicks,
        createdAt: result.Item.createdAt
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

Deploy it:

```bash
cd ../stats
cp ../shorten/package.json .
npm install
zip -r function.zip .

aws lambda create-function \
  --function-name url-stats \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 256
```

---

## Part 3: API Gateway (2 hours)

### Step 9: Create REST API

```bash
# Create API
aws apigateway create-rest-api \
  --name url-shortener-api \
  --description "Serverless URL Shortener" \
  --endpoint-configuration types=REGIONAL

# Get API ID
export API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='url-shortener-api'].id" \
  --output text)

echo "API ID: $API_ID"

# Get root resource ID
export ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root Resource ID: $ROOT_ID"
```

### Step 10: Create /shorten Endpoint

```bash
# Create /shorten resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part shorten

# Get shorten resource ID
export SHORTEN_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/shorten'].id" \
  --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $SHORTEN_ID \
  --http-method POST \
  --authorization-type NONE

# Get Lambda function ARN
export SHORTEN_ARN=$(aws lambda get-function \
  --function-name url-shorten \
  --query 'Configuration.FunctionArn' \
  --output text)

# Get AWS account ID
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $SHORTEN_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$SHORTEN_ARN/invocations"

# Give API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name url-shorten \
  --statement-id apigateway-shorten \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"
```

### Step 11: Create /{shortCode} Endpoint

```bash
# Create {shortCode} resource with path parameter
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part '{shortCode}'

export CODE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/{shortCode}'].id" \
  --output text)

# Create GET method for redirect
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CODE_ID \
  --http-method GET \
  --authorization-type NONE \
  --request-parameters method.request.path.shortCode=true

export REDIRECT_ARN=$(aws lambda get-function \
  --function-name url-redirect \
  --query 'Configuration.FunctionArn' \
  --output text)

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CODE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$REDIRECT_ARN/invocations"

# Permission
aws lambda add-permission \
  --function-name url-redirect \
  --statement-id apigateway-redirect \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"
```

### Step 12: Create /stats/{shortCode} Endpoint

```bash
# Create stats resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part stats

export STATS_ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/stats'].id" \
  --output text)

# Create {shortCode} under stats
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $STATS_ROOT_ID \
  --path-part '{shortCode}'

export STATS_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/stats/{shortCode}'].id" \
  --output text)

# Create GET method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $STATS_ID \
  --http-method GET \
  --authorization-type NONE

export STATS_ARN=$(aws lambda get-function \
  --function-name url-stats \
  --query 'Configuration.FunctionArn' \
  --output text)

# Integrate
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $STATS_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$STATS_ARN/invocations"

# Permission
aws lambda add-permission \
  --function-name url-stats \
  --statement-id apigateway-stats \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"
```

### Step 13: Deploy API

```bash
# Create deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

# Get API endpoint
export API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"

echo "API Endpoint: $API_ENDPOINT"
```

---

## Part 4: Test Your API (30 minutes)

### Step 14: Test All Endpoints

```bash
# Create a short URL
curl -X POST $API_ENDPOINT/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://aws.amazon.com"}'

# Response: {"shortCode":"abc123","shortUrl":"...","originalUrl":"..."}

# Test redirect (use the shortCode from above)
curl -I $API_ENDPOINT/abc123

# Check stats
curl $API_ENDPOINT/stats/abc123

# Create custom short code
curl -X POST $API_ENDPOINT/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "customCode": "github"}'

# Test custom code
curl -I $API_ENDPOINT/github
```

**Everything working?** You just built a serverless API! 🎉

---

## Part 5: Monitoring & Debugging (1 hour)

### Step 15: View CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/url-

# Get logs for shorten function
aws logs tail /aws/lambda/url-shorten --follow

# Or view in console
# CloudWatch → Log groups → /aws/lambda/url-shorten
```

### Step 16: Check Lambda Metrics

```bash
# Get invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=url-shorten \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# View in console: Lambda → Functions → url-shorten → Monitoring
```

### Step 17: Enable X-Ray Tracing (Optional)

```bash
# Enable tracing on all functions
for func in url-shorten url-redirect url-stats; do
  aws lambda update-function-configuration \
    --function-name $func \
    --tracing-config Mode=Active
done

# View traces in X-Ray console after making requests
```

---

## Challenges (Optional)

### Easy
- [ ] Add a DELETE endpoint to remove short URLs
- [ ] Add expiration time to URLs (TTL in DynamoDB)
- [ ] Add validation for custom short codes (no special chars)

### Medium
- [ ] Add API key authentication
- [ ] Create a simple frontend (host on S3 from Lesson 1!)
- [ ] Add rate limiting using API Gateway
- [ ] Store click timestamps in DynamoDB for analytics

### Hard
- [ ] Add custom domains with Route 53
- [ ] Implement QR code generation for short URLs
- [ ] Add global secondary index for querying by original URL
- [ ] Create Lambda function to clean up expired URLs

---

## Troubleshooting

**Lambda function not executing?**
- Check IAM role has correct permissions
- View CloudWatch Logs for errors
- Test function directly with `aws lambda invoke`

**API Gateway returning 502?**
- Lambda function must return proper response format
- Check Lambda logs for errors
- Verify integration is set to `AWS_PROXY`

**DynamoDB access denied?**
- Check Lambda role has DynamoDB permissions
- Verify table name matches in code
- Check region matches

**Cold start latency?**
- First request to Lambda is slower (cold start)
- Consider provisioned concurrency for production
- Optimize function package size

---

## Cleanup (IMPORTANT!)

```bash
# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete Lambda functions
for func in url-shorten url-redirect url-stats; do
  aws lambda delete-function --function-name $func
done

# Delete DynamoDB table
aws dynamodb delete-table --table-name url-shortener

# Delete IAM role policies
aws iam delete-role-policy \
  --role-name lambda-url-shortener-role \
  --policy-name DynamoDBAccess

aws iam detach-role-policy \
  --role-name lambda-url-shortener-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Delete IAM role
aws iam delete-role --role-name lambda-url-shortener-role
```

**Cost if you keep it running**: ~$0 (free tier covers it!)

---

## What You Learned

- ✅ Built serverless REST API with Lambda
- ✅ Created API Gateway endpoints
- ✅ Stored data in DynamoDB NoSQL database
- ✅ Managed Lambda permissions with IAM roles
- ✅ Debugged with CloudWatch Logs
- ✅ Understood serverless architecture patterns
- ✅ No servers to manage! 🎉

---

## Serverless vs Servers: When to Use What

**Use Serverless (Lambda) when:**
- Unpredictable or spiky traffic
- Want to minimize operational overhead
- Event-driven workloads
- Short-running tasks (< 15 minutes)
- Cost optimization for low traffic

**Use Servers (EC2) when:**
- Predictable, steady traffic
- Long-running processes
- Need specific OS/kernel features
- Legacy applications
- Very high, sustained traffic (cheaper at scale)

**Best practice**: Start serverless, move to servers only if needed!

---

## Next Steps

Head to [Lesson 4: Automate All The Things](../lesson-04-automate-all-things/) to recreate this ENTIRE lesson with Infrastructure as Code using Terraform. No more manual clicking or CLI commands - define everything in code!

You'll learn why "clicking around the console" is not how pros do it. 🚀
