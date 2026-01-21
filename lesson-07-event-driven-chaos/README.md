# Lesson 7: Event-Driven Chaos (Master Async Workflows) 🎭

**Time**: ~8 hours | **Cost**: ~$2-3 (mostly free tier!)

## What You're Building

Build a complete order processing system using event-driven architecture. When an order is placed, it triggers a complex workflow: validate payment, check inventory, send notifications, update databases, and handle failures gracefully. You'll use SNS (pub/sub messaging), SQS (queues), EventBridge (event bus), and Step Functions (orchestration).

Real-world use case: E-commerce order processing, payment systems, workflow automation, microservices communication.

## What You'll Learn

- **SNS**: Pub/Sub messaging (one-to-many)
- **SQS**: Message queues (reliable delivery)
- **EventBridge**: Event bus (routing events)
- **Step Functions**: Workflow orchestration
- **Dead Letter Queues**: Error handling
- **Fan-out patterns**: Parallel processing
- **Event-driven architecture**: Design patterns

## Prerequisites

- [ ] Completed Lessons 1-6
- [ ] AWS CLI configured
- [ ] Node.js installed
- [ ] Understanding of async messaging

---

## Architecture Overview

```
API Gateway → Lambda (Place Order)
                ↓
           EventBridge
                ↓
         ┌──────┴──────┐
         ↓             ↓
    Step Function    SNS Topic
         ↓             ↓
    Validate      ┌────┴────┐
         ↓        ↓         ↓
    Reserve     Email     SMS
         ↓      Lambda   Lambda
    Process
         ↓
     Complete
```

---

## Part 1: SNS Topics (Simple Notification Service) (1 hour)

### Step 1: Create SNS Topics

```bash
# Create topic for order events
aws sns create-topic --name order-events

export ORDER_TOPIC_ARN=$(aws sns list-topics \
  --query "Topics[?contains(TopicArn, 'order-events')].TopicArn" \
  --output text)

echo "Order Topic ARN: $ORDER_TOPIC_ARN"

# Create topic for notifications
aws sns create-topic --name order-notifications

export NOTIFICATION_TOPIC_ARN=$(aws sns list-topics \
  --query "Topics[?contains(TopicArn, 'order-notifications')].TopicArn" \
  --output text)
```

### Step 2: Subscribe Email to Notifications

```bash
# Replace with your email
export YOUR_EMAIL="your-email@example.com"

aws sns subscribe \
  --topic-arn $NOTIFICATION_TOPIC_ARN \
  --protocol email \
  --notification-endpoint $YOUR_EMAIL

# Check your email and confirm subscription!
```

### Step 3: Test SNS Publishing

```bash
# Publish test message
aws sns publish \
  --topic-arn $NOTIFICATION_TOPIC_ARN \
  --subject "Test Order Notification" \
  --message "Your order has been placed successfully!"

# Check your email!
```

---

## Part 2: SQS Queues (Simple Queue Service) (1 hour)

### Step 4: Create SQS Queues

```bash
# Main processing queue
aws sqs create-queue --queue-name order-processing-queue

export PROCESSING_QUEUE_URL=$(aws sqs get-queue-url \
  --queue-name order-processing-queue \
  --query 'QueueUrl' \
  --output text)

export PROCESSING_QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url $PROCESSING_QUEUE_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Dead letter queue for failed messages
aws sqs create-queue \
  --queue-name order-processing-dlq \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }'

export DLQ_URL=$(aws sqs get-queue-url \
  --queue-name order-processing-dlq \
  --query 'QueueUrl' \
  --output text)

export DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Configure DLQ on processing queue
aws sqs set-queue-attributes \
  --queue-url $PROCESSING_QUEUE_URL \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
  }'
```

### Step 5: Subscribe SQS to SNS (Fan-out Pattern)

```bash
# Allow SNS to send to SQS
aws sqs set-queue-attributes \
  --queue-url $PROCESSING_QUEUE_URL \
  --attributes '{
    "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"sns.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"'"$PROCESSING_QUEUE_ARN"'\",\"Condition\":{\"ArnEquals\":{\"aws:SourceArn\":\"'"$ORDER_TOPIC_ARN"'\"}}}]}"
  }'

# Subscribe SQS to SNS
aws sns subscribe \
  --topic-arn $ORDER_TOPIC_ARN \
  --protocol sqs \
  --notification-endpoint $PROCESSING_QUEUE_ARN
```

### Step 6: Test Fan-out Pattern

```bash
# Publish to SNS
aws sns publish \
  --topic-arn $ORDER_TOPIC_ARN \
  --message '{"orderId":"12345","customer":"John","amount":99.99}'

# Receive from SQS (message should appear in queue)
aws sqs receive-message --queue-url $PROCESSING_QUEUE_URL

# Delete message after processing
aws sqs delete-message \
  --queue-url $PROCESSING_QUEUE_URL \
  --receipt-handle "RECEIPT_HANDLE_FROM_ABOVE"
```

---

## Part 3: EventBridge (Event Bus) (1.5 hours)

### Step 7: Create Custom Event Bus

```bash
# Create event bus
aws events create-event-bus --name order-event-bus

# Create rule for new orders
aws events put-rule \
  --name new-order-rule \
  --event-bus-name order-event-bus \
  --event-pattern '{
    "source": ["order.service"],
    "detail-type": ["Order Placed"]
  }'

# Get rule ARN
export RULE_ARN=$(aws events describe-rule \
  --name new-order-rule \
  --event-bus-name order-event-bus \
  --query 'Arn' \
  --output text)
```

### Step 8: Create Lambda for EventBridge Target

Create `event-processor/index.js`:

```javascript
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const detail = event.detail;

  console.log(`Processing order ${detail.orderId} for customer ${detail.customer}`);

  // Your processing logic here
  // - Validate order
  // - Check inventory
  // - Calculate shipping
  // etc.

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Event processed',
      orderId: detail.orderId
    })
  };
};
```

Deploy:

```bash
cd event-processor
zip function.zip index.js

# Create Lambda role (reuse from previous lessons or create new)
# Assuming role exists from previous lessons
export LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name lambda-url-shortener-role \
  --query 'Role.Arn' \
  --output text 2>/dev/null || echo "CREATE_ROLE_FIRST")

aws lambda create-function \
  --function-name order-event-processor \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10
```

### Step 9: Add Lambda as EventBridge Target

```bash
# Give EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name order-event-processor \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn $RULE_ARN

# Add Lambda as target
aws events put-targets \
  --rule new-order-rule \
  --event-bus-name order-event-bus \
  --targets "Id"="1","Arn"="$(aws lambda get-function --function-name order-event-processor --query 'Configuration.FunctionArn' --output text)"
```

### Step 10: Test EventBridge

```bash
# Send event to EventBridge
aws events put-events \
  --entries '[
    {
      "Source": "order.service",
      "DetailType": "Order Placed",
      "Detail": "{\"orderId\":\"ORD-001\",\"customer\":\"Jane Doe\",\"amount\":149.99,\"items\":[{\"product\":\"Widget\",\"quantity\":2}]}",
      "EventBusName": "order-event-bus"
    }
  ]'

# Check Lambda logs
sleep 5
aws logs tail /aws/lambda/order-event-processor --follow
```

---

## Part 4: Step Functions (Workflow Orchestration) (2.5 hours)

### Step 11: Create Step Functions Role

```bash
# Create trust policy
cat > step-functions-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "states.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name order-step-functions-role \
  --assume-role-policy-document file://step-functions-trust-policy.json

# Attach Lambda invoke policy
cat > step-functions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name order-step-functions-role \
  --policy-name StepFunctionsExecutionPolicy \
  --policy-document file://step-functions-policy.json

export STEP_ROLE_ARN=$(aws iam get-role \
  --role-name order-step-functions-role \
  --query 'Role.Arn' \
  --output text)
```

### Step 12: Create Lambda Functions for Each Step

Create `validate-payment/index.js`:

```javascript
exports.handler = async (event) => {
  console.log('Validating payment for order:', event.orderId);

  // Simulate payment validation
  const isValid = Math.random() > 0.2; // 80% success rate

  if (!isValid) {
    throw new Error('Payment validation failed');
  }

  return {
    ...event,
    paymentValidated: true,
    paymentId: `PAY-${Date.now()}`
  };
};
```

Create `check-inventory/index.js`:

```javascript
exports.handler = async (event) => {
  console.log('Checking inventory for order:', event.orderId);

  // Simulate inventory check
  const inStock = Math.random() > 0.1; // 90% in stock

  if (!inStock) {
    throw new Error('Item out of stock');
  }

  return {
    ...event,
    inventoryReserved: true,
    estimatedShipping: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };
};
```

Create `process-order/index.js`:

```javascript
exports.handler = async (event) => {
  console.log('Processing order:', event.orderId);

  // Simulate order processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    ...event,
    status: 'processed',
    processedAt: new Date().toISOString()
  };
};
```

Create `send-notification/index.js`:

```javascript
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const sns = new SNSClient({});

exports.handler = async (event) => {
  console.log('Sending notification for order:', event.orderId);

  const message = `Order ${event.orderId} has been ${event.status}!
Customer: ${event.customer}
Amount: $${event.amount}
Estimated Shipping: ${event.estimatedShipping || 'TBD'}`;

  await sns.send(new PublishCommand({
    TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
    Subject: `Order ${event.orderId} Update`,
    Message: message
  }));

  return {
    ...event,
    notificationSent: true
  };
};
```

Deploy all functions:

```bash
# Validate payment
cd validate-payment
zip function.zip index.js
aws lambda create-function \
  --function-name validate-payment \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10
cd ..

# Check inventory
cd check-inventory
zip function.zip index.js
aws lambda create-function \
  --function-name check-inventory \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10
cd ..

# Process order
cd process-order
zip function.zip index.js
aws lambda create-function \
  --function-name process-order \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10
cd ..

# Send notification (needs SNS client)
cd send-notification
npm init -y
npm install @aws-sdk/client-sns
zip -r function.zip .
aws lambda create-function \
  --function-name send-notification \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --environment "Variables={NOTIFICATION_TOPIC_ARN=$NOTIFICATION_TOPIC_ARN}"
cd ..
```

### Step 13: Create Step Functions State Machine

Create `state-machine.json`:

```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidatePayment",
  "States": {
    "ValidatePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:validate-payment",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 2,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "PaymentFailed"
        }
      ],
      "Next": "CheckInventory"
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:check-inventory",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "InventoryFailed"
        }
      ],
      "Next": "ProcessOrder"
    },
    "ProcessOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:process-order",
      "Next": "SendNotification"
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:send-notification",
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "PaymentFailed": {
      "Type": "Fail",
      "Error": "PaymentValidationError",
      "Cause": "Payment could not be validated"
    },
    "InventoryFailed": {
      "Type": "Fail",
      "Error": "InventoryError",
      "Cause": "Item out of stock"
    }
  }
}
```

Replace ACCOUNT_ID and create state machine:

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update ARNs in state machine definition
sed -i.bak "s/ACCOUNT_ID/$ACCOUNT_ID/g" state-machine.json

# Create state machine
aws stepfunctions create-state-machine \
  --name order-processing-workflow \
  --definition file://state-machine.json \
  --role-arn $STEP_ROLE_ARN

export STATE_MACHINE_ARN=$(aws stepfunctions list-state-machines \
  --query "stateMachines[?name=='order-processing-workflow'].stateMachineArn" \
  --output text)

echo "State Machine ARN: $STATE_MACHINE_ARN"
```

### Step 14: Execute Workflow

```bash
# Start execution
aws stepfunctions start-execution \
  --state-machine-arn $STATE_MACHINE_ARN \
  --input '{
    "orderId": "ORD-12345",
    "customer": "Alice Johnson",
    "amount": 299.99,
    "items": [
      {"product": "Laptop", "quantity": 1}
    ]
  }'

# Get execution ARN from output, then check status
export EXECUTION_ARN="paste-execution-arn-here"

aws stepfunctions describe-execution --execution-arn $EXECUTION_ARN

# View execution history
aws stepfunctions get-execution-history --execution-arn $EXECUTION_ARN

# Or view in console: Step Functions → State machines → order-processing-workflow
```

**Check your email for notification!**

### Step 15: Test Error Handling

```bash
# This might fail at payment validation (20% failure rate)
# Try multiple times to see retry logic and error handling
for i in {1..5}; do
  aws stepfunctions start-execution \
    --state-machine-arn $STATE_MACHINE_ARN \
    --name "execution-$i" \
    --input "{\"orderId\":\"ORD-$(date +%s)\",\"customer\":\"Test User\",\"amount\":$((RANDOM % 500 + 50))}"

  sleep 2
done

# View in console to see success/failure patterns
```

---

## Part 5: Complete Integration (1.5 hours)

### Step 16: Create Order Placement API

Create `place-order/index.js`:

```javascript
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');

const eventBridge = new EventBridgeClient({});
const stepFunctions = new SFNClient({});

exports.handler = async (event) => {
  console.log('Placing order:', event.body);

  const order = JSON.parse(event.body);
  const orderId = `ORD-${Date.now()}`;

  const orderData = {
    orderId,
    ...order,
    timestamp: new Date().toISOString()
  };

  try {
    // Send event to EventBridge
    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'order.service',
          DetailType: 'Order Placed',
          Detail: JSON.stringify(orderData),
          EventBusName: 'order-event-bus'
        }
      ]
    }));

    // Start Step Functions workflow
    await stepFunctions.send(new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(orderData)
    }));

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Order placed successfully',
        orderId,
        status: 'processing'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to place order' })
    };
  }
};
```

Deploy:

```bash
cd place-order
npm init -y
npm install @aws-sdk/client-eventbridge @aws-sdk/client-sfn
zip -r function.zip .

# Update Lambda role to allow EventBridge and Step Functions
cat > lambda-extended-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "events:PutEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "states:StartExecution"
      ],
      "Resource": "$STATE_MACHINE_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name lambda-url-shortener-role \
  --policy-name EventDrivenPermissions \
  --policy-document file://lambda-extended-policy.json

aws lambda create-function \
  --function-name place-order \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --environment "Variables={STATE_MACHINE_ARN=$STATE_MACHINE_ARN}"
cd ..
```

### Step 17: Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
  --name order-api \
  --description "Order placement API"

export API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='order-api'].id" \
  --output text)

export ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[?path==`/`].id' \
  --output text)

# Create /orders resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part orders

export ORDERS_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/orders'].id" \
  --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ORDERS_ID \
  --http-method POST \
  --authorization-type NONE

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ORDERS_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$(aws lambda get-function --function-name place-order --query 'Configuration.FunctionArn' --output text)/invocations"

# Give permission
aws lambda add-permission \
  --function-name place-order \
  --statement-id apigateway-place-order \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"

# Deploy API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

export API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
echo "API Endpoint: $API_ENDPOINT"
```

### Step 18: Test Complete System

```bash
# Place order via API
curl -X POST $API_ENDPOINT/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "Bob Smith",
    "amount": 499.99,
    "items": [
      {"product": "Gaming Console", "quantity": 1},
      {"product": "Controller", "quantity": 2}
    ]
  }'

# Watch the magic happen:
# 1. EventBridge receives event
# 2. Step Functions workflow starts
# 3. Payment validated
# 4. Inventory checked
# 5. Order processed
# 6. Notification sent (check email!)
# 7. SQS receives message

# Check Step Functions executions
aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --max-results 5

# Check SQS queue
aws sqs receive-message --queue-url $PROCESSING_QUEUE_URL
```

---

## Challenges (Optional)

### Easy
- [ ] Add more notification channels (SMS using SNS)
- [ ] View Step Functions execution graph in console
- [ ] Monitor SQS queue depth

### Medium
- [ ] Add parallel processing with Step Functions Map state
- [ ] Implement saga pattern for distributed transactions
- [ ] Add CloudWatch alarms for failed executions
- [ ] Create dashboard showing order processing metrics

### Hard
- [ ] Implement event sourcing pattern
- [ ] Add CQRS (Command Query Responsibility Segregation)
- [ ] Build order cancellation workflow
- [ ] Add distributed tracing with X-Ray

---

## Troubleshooting

**Step Functions execution fails?**
- Check Lambda function logs
- Verify IAM permissions
- Check input/output format matches between steps

**EventBridge not triggering?**
- Verify event pattern matches
- Check Lambda has permission
- View EventBridge metrics

**SQS messages not processing?**
- Check DLQ for failed messages
- Verify queue permissions
- Check visibility timeout

---

## Cleanup

```bash
# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete Step Functions state machine
aws stepfunctions delete-state-machine --state-machine-arn $STATE_MACHINE_ARN

# Delete Lambda functions
for func in order-event-processor validate-payment check-inventory process-order send-notification place-order; do
  aws lambda delete-function --function-name $func
done

# Delete EventBridge rule and bus
aws events remove-targets --rule new-order-rule --event-bus-name order-event-bus --ids 1
aws events delete-rule --name new-order-rule --event-bus-name order-event-bus
aws events delete-event-bus --name order-event-bus

# Delete SQS queues
aws sqs delete-queue --queue-url $PROCESSING_QUEUE_URL
aws sqs delete-queue --queue-url $DLQ_URL

# Delete SNS topics
aws sns delete-topic --topic-arn $ORDER_TOPIC_ARN
aws sns delete-topic --topic-arn $NOTIFICATION_TOPIC_ARN

# Delete IAM roles
# (cleanup commands for roles...)
```

---

## What You Learned

- ✅ Built pub/sub messaging with SNS
- ✅ Created reliable queues with SQS
- ✅ Routed events with EventBridge
- ✅ Orchestrated workflows with Step Functions
- ✅ Implemented error handling and retries
- ✅ Designed event-driven architectures
- ✅ Used fan-out patterns for parallel processing

---

## Next Steps

Head to [Lesson 8: Big Data Analytics](../lesson-08-big-data/) to learn Kinesis, Glue, and Athena for processing and analyzing massive amounts of data! 🚀
