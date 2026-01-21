variable "filename" {
  type = string
}

variable "function_name" {
  type = string
}

variable "role_arn" {
  type = string
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "timeout" {
  type    = number
  default = 10
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "source_code_hash" {
  type = string
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "api_gateway_execution_arn" {
  type = string
}
