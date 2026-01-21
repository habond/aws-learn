# Lesson 4 Notes: Infrastructure as Code with Terraform

## Key Concepts

### Infrastructure as Code (IaC)
- Define infrastructure in version-controlled files
- Reproducible, consistent deployments
- Declarative (what you want, not how to build it)
- Changes reviewed like code (PRs, code review)

### Terraform Basics
- `terraform init` - Initialize, download providers
- `terraform plan` - Preview changes
- `terraform apply` - Create/update infrastructure
- `terraform destroy` - Delete everything
- `terraform state` - Manage state

### State Management
- Terraform tracks what it created in state file
- State contains resource IDs, attributes
- Remote state (S3) for team collaboration
- State locking prevents concurrent changes

### Terraform Resources
- `resource` - Something to create (EC2, Lambda, etc)
- `data` - Query existing resources
- `variable` - Input parameters
- `output` - Values to display/export
- `module` - Reusable infrastructure components

## Best Practices

### Code Organization
- One resource per logical block
- Use modules for reusability
- Separate environments (workspaces or directories)
- Keep files focused (networking.tf, lambda.tf, etc)

### Variables
- Use variables for anything that changes
- Set defaults for reasonable values
- Document with descriptions
- Use terraform.tfvars for values (don't commit secrets!)

### State
- Always use remote state for teams
- Enable state locking
- Back up state files
- Never manually edit state

## Common Terraform Patterns

### Count for Multiple Similar Resources
```hcl
resource "aws_instance" "web" {
  count = 3
  # Creates 3 instances
}
```

### For Each for Named Resources
```hcl
resource "aws_iam_user" "users" {
  for_each = toset(["alice", "bob", "charlie"])
  name     = each.value
}
```

### Conditional Resources
```hcl
resource "aws_instance" "example" {
  count = var.create_instance ? 1 : 0
}
```

## My Notes

(Add your own notes here as you work through the lesson)
