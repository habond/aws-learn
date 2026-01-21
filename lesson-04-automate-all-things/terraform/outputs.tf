output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.url_shortener.name
}

output "lambda_functions" {
  description = "Lambda function names"
  value = {
    shorten  = aws_lambda_function.shorten.function_name
    redirect = aws_lambda_function.redirect.function_name
    stats    = aws_lambda_function.stats.function_name
  }
}
