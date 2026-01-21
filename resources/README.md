# Resources & Helpers

This directory contains helpful scripts, templates, and resources you can use throughout the curriculum.

## What's Here

- **cost-tracker.md** - Track your AWS spending per lesson
- **aws-cheatsheet.md** - Quick reference for common AWS CLI commands
- **cleanup-all.sh** - Emergency script to delete common resources
- **setup-env.sh** - Set up common environment variables
- **terraform-templates/** - Reusable Terraform modules

## Quick Start

### Set Up Environment Variables

```bash
# Source this file to set common variables
source setup-env.sh
```

### Track Your Costs

```bash
# Check current month's costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --output table
```

### Emergency Cleanup

```bash
# If you forgot to clean up resources, run:
./cleanup-all.sh

# WARNING: This will delete ALL resources created during lessons!
# Review the script before running!
```

## Helpful AWS CLI Commands

See [aws-cheatsheet.md](./aws-cheatsheet.md) for a comprehensive list.

## Cost Management Tips

1. **Always clean up after lessons** - Use the cleanup sections in each lesson
2. **Set billing alerts** - Get notified before costs get high
3. **Use tags** - Tag all resources with lesson name for easy tracking
4. **Check daily** - Review your costs in AWS Cost Explorer
5. **Use free tier** - Most lessons can stay within free tier limits

## Additional Resources

- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
