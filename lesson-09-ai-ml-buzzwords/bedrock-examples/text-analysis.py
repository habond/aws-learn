#!/usr/bin/env python3
import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def analyze_text(text):
    """Analyze text using Claude via Bedrock"""
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
    # Example usage
    test_texts = [
        "I love this product! It's absolutely amazing and works perfectly.",
        "This is the worst experience I've ever had. Completely disappointed.",
        "The service was adequate. Nothing special but got the job done."
    ]

    for text in test_texts:
        print(f"\nAnalyzing: {text}")
        print("="*50)
        analysis = analyze_text(text)
        print(analysis)
        print()
