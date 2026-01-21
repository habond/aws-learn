# Lesson 1: Your First Internet Empire 🌐

**Time**: ~6 hours | **Cost**: ~$1-2 (domain optional)

## What You're Building

Deploy your own corner of the internet: a lightning-fast static website with a custom domain, served globally via CDN. You'll build something ridiculous and fun (because why not?) while learning the fundamentals of AWS.

## What You'll Learn

- **S3**: Object storage and static website hosting
- **CloudFront**: Content Delivery Network (CDN)
- **Route 53**: DNS and domain management
- **IAM**: Identity and Access Management
- **AWS CLI**: Command-line superpowers
- **CloudWatch**: Basic monitoring

## Prerequisites

- [ ] AWS account created
- [ ] AWS CLI installed (`aws --version` should work)
- [ ] Text editor ready
- [ ] Terminal open
- [ ] Credit card ready for domain (optional, ~$12/year)

---

## Part 1: AWS Account Setup (30 minutes)

### Step 1: Set Up Billing Alerts

**Why**: So AWS doesn't surprise you with a $500 bill

1. Go to AWS Console → Billing Dashboard
2. Click "Billing preferences"
3. Enable "Receive Billing Alerts"
4. Set up a CloudWatch alarm for $10 threshold
5. Add your email

**CLI equivalent** (we'll do this later):
```bash
# We'll create this via console first to understand the flow
```

### Step 2: Create IAM User (You!)

**Why**: Never use root account for daily tasks

1. Go to IAM → Users → Add User
2. Username: `your-name-admin`
3. Enable "AWS Management Console access"
4. Attach policy: `AdministratorAccess` (we'll lock this down in Lesson 11)
5. **Important**: Save credentials somewhere safe!
6. Enable MFA (Multi-Factor Auth) - use phone authenticator app

### Step 3: Configure AWS CLI

```bash
# Configure your CLI with IAM user credentials
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1 (or your preferred region)
# - Default output format: json

# Test it works
aws sts get-caller-identity
```

You should see your IAM user info. If so, you're ready to build!

---

## Part 2: Build Your Website (1 hour)

### Step 4: Create Your Masterpiece

Pick one (or make your own):
- **Personal site**: Portfolio, blog, "about me"
- **Hot take generator**: Random opinions on tech
- **Meme portfolio**: Your finest work
- **Product landing page**: For your imaginary startup

**Use the starter template** in the `website/` folder, or create your own!

```bash
cd lesson-01-first-internet-empire/website

# Check out the files
ls -la
```

**Pro tip**: Keep it simple for now. You can make it fancy later. A single `index.html` is fine!

### What Makes a Good Static Site for This Lesson:
- HTML/CSS/JavaScript only (no server-side code)
- Images (so we can test CDN performance)
- Multiple pages (to test routing)
- Some CSS/JS files (to test caching)

---

## Part 3: S3 - Your Files in the Cloud (1.5 hours)

### Step 5: Create S3 Bucket

**Bucket names must be globally unique!**

```bash
# Choose a unique bucket name (lowercase, no spaces)
BUCKET_NAME="your-name-awesome-site-2026"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Verify it exists
aws s3 ls
```

### Step 6: Configure for Static Website Hosting

```bash
# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document error.html
```

### Step 7: Upload Your Website

```bash
# From the website directory
cd website/

# Upload everything
aws s3 sync . s3://$BUCKET_NAME

# List what you uploaded
aws s3 ls s3://$BUCKET_NAME --recursive
```

### Step 8: Make It Public

**Create bucket policy** (save as `bucket-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

**Replace `YOUR-BUCKET-NAME`** with your actual bucket name!

```bash
# Apply the policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json
```

### Step 9: Test S3 Website

Your site is now live at:
```
http://YOUR-BUCKET-NAME.s3-website-us-east-1.amazonaws.com
```

**Visit it in your browser!** Does it work? Congrats, you're hosting on AWS!

**Try this**:
- Open browser DevTools → Network tab
- Reload the page
- Check the response time
- Note the location (probably Virginia if you used us-east-1)

---

## Part 4: CloudFront - Make It Fast Globally (2 hours)

### Step 10: Create CloudFront Distribution

**Via Console** (easier for first time):

1. Go to CloudFront → Create Distribution
2. **Origin domain**: Click and select your S3 bucket
3. **Origin path**: Leave empty
4. **Name**: `my-awesome-site`
5. **Viewer protocol policy**: Redirect HTTP to HTTPS
6. **Allowed HTTP methods**: GET, HEAD
7. **Cache policy**: CachingOptimized
8. **Price class**: Use all edge locations (for learning)
9. **Alternate domain names (CNAMEs)**: Leave empty for now
10. **Default root object**: `index.html`
11. Click "Create Distribution"

**This takes 10-15 minutes to deploy** ☕ Good time for a coffee break!

### Step 11: Test CloudFront

Once status is "Deployed":

```bash
# Your CloudFront URL
# Format: https://d1234567890abc.cloudfront.net
```

**Visit it!** Your site is now served from AWS's global CDN!

**Try this**:
- Open DevTools → Network tab
- Reload the page
- Check response time (should be faster!)
- Look for `x-cache: Hit from cloudfront` header
- Reload again - should be even faster (cache hit!)

### Step 12: Measure the Difference

**Fun experiment**:

```bash
# Test S3 directly (from your location)
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  http://YOUR-BUCKET-NAME.s3-website-us-east-1.amazonaws.com

# Test CloudFront
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  https://YOUR-CLOUDFRONT-URL.cloudfront.net
```

CloudFront should be faster! That's the CDN magic. ✨

---

## Part 5: Route 53 - Custom Domain (1.5 hours)

### Step 13: Register a Domain (Optional)

**If you want a custom domain** (costs ~$12/year):

1. Go to Route 53 → Registered domains → Register domain
2. Search for available domain
3. Add to cart and complete purchase
4. **Takes 10-15 minutes** to register

**Skip this step if**:
- You already have a domain
- You don't want to spend $12
- You're fine with the CloudFront URL

### Step 14: Create Hosted Zone

```bash
# If you registered domain via Route 53, hosted zone is auto-created
# Otherwise:
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)
```

### Step 15: Point Domain to CloudFront

1. Go to Route 53 → Hosted zones → Your domain
2. Click "Create record"
3. **Record name**: Leave empty (for root domain) or `www`
4. **Record type**: A
5. **Alias**: Yes
6. **Route traffic to**: CloudFront distribution
7. **Choose your distribution** from dropdown
8. Click "Create records"

**DNS propagation takes 5-60 minutes**. Be patient!

### Step 16: Add SSL Certificate (HTTPS)

**CloudFront provides free SSL** via AWS Certificate Manager!

1. Go to AWS Certificate Manager (ACM) - **MUST be in us-east-1 region**
2. Request certificate
3. Add domain names: `yourdomain.com` and `www.yourdomain.com`
4. Validation method: DNS validation
5. Click "Create records in Route 53" (easy mode!)
6. Wait for validation (~5-10 minutes)

**Update CloudFront**:
1. Go to CloudFront → Your distribution → Edit
2. **Alternate domain names**: Add `yourdomain.com`
3. **Custom SSL certificate**: Select your ACM certificate
4. Save changes

**Wait for deployment** (~10-15 minutes again ☕)

### Step 17: Celebrate!

Visit `https://yourdomain.com` - you now own a piece of the internet! 🎉

---

## Part 6: CloudWatch - Know What's Happening (30 minutes)

### Step 18: Check CloudFront Metrics

1. Go to CloudFront → Your distribution → Monitoring
2. Check out:
   - **Requests**: How many people visited
   - **Bytes downloaded**: How much data served
   - **Error rate**: Hopefully 0%!

### Step 19: Enable S3 Metrics

```bash
# Enable request metrics for your bucket
aws s3api put-bucket-metrics-configuration \
  --bucket $BUCKET_NAME \
  --id EntireBucket \
  --metrics-configuration Id=EntireBucket
```

### Step 20: Create a Dashboard

1. Go to CloudWatch → Dashboards → Create dashboard
2. Name it: `my-website-dashboard`
3. Add widgets:
   - CloudFront requests
   - CloudFront bytes downloaded
   - S3 bucket size
4. Save dashboard

**Now you can see your website's stats at a glance!**

---

## Part 7: Make Updates (15 minutes)

### Step 21: Update Your Site

```bash
# Edit website/index.html (make any change)

# Upload to S3
cd website/
aws s3 sync . s3://$BUCKET_NAME

# Invalidate CloudFront cache (so changes show immediately)
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/*"
```

**Check your site** - changes should appear in ~1-2 minutes!

---

## Part 8: AWS CLI Practice (30 minutes)

### Useful Commands to Know

```bash
# List all your S3 buckets
aws s3 ls

# Check bucket size
aws s3 ls s3://$BUCKET_NAME --recursive --human-readable --summarize

# Download entire bucket (backup)
aws s3 sync s3://$BUCKET_NAME ./backup/

# List CloudFront distributions
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName]'

# Get distribution config
aws cloudfront get-distribution --id YOUR-DISTRIBUTION-ID

# Check your current AWS identity
aws sts get-caller-identity

# List all Route 53 hosted zones
aws route53 list-hosted-zones
```

**Practice these!** CLI mastery = AWS superpowers. 🦸

---

## Challenges (Optional)

### Easy
- [ ] Add a custom 404 error page
- [ ] Add an image and verify it's served from CloudFront
- [ ] Share your site with a friend and check CloudWatch for traffic

### Medium
- [ ] Set up CloudFront caching for different file types (HTML vs images)
- [ ] Add a second domain (www subdomain)
- [ ] Create a staging environment (second S3 bucket + CloudFront)

### Hard
- [ ] Set up CloudFront Functions for A/B testing
- [ ] Add CloudFront access logs to S3
- [ ] Create a custom domain for CloudFront distribution

---

## Cleanup (IMPORTANT!)

**If you want to minimize costs**:

```bash
# Empty S3 bucket first
aws s3 rm s3://$BUCKET_NAME --recursive

# Delete bucket
aws s3 rb s3://$BUCKET_NAME

# Disable CloudFront distribution
# (Must do via Console - it's a multi-step process)
# 1. CloudFront → Distribution → Disable
# 2. Wait 15 minutes
# 3. Delete distribution

# Delete Route 53 hosted zone (if not using domain)
# (Keep this if you paid for the domain!)
```

**If you want to keep it running**:
- Cost: ~$0.50-1/month for CloudFront + S3 (basically free)
- You now have a live portfolio site!

---

## What You Learned

- ✅ Set up AWS account securely (IAM, MFA, billing alerts)
- ✅ Used AWS CLI for everything
- ✅ Deployed static website to S3
- ✅ Configured CloudFront CDN for global performance
- ✅ Set up custom domain with Route 53
- ✅ Added SSL certificate (HTTPS)
- ✅ Monitored with CloudWatch
- ✅ Understand S3, CloudFront, Route 53, IAM basics

---

## Troubleshooting

**S3 bucket policy not working?**
- Make sure bucket name in policy matches exactly
- Check "Block Public Access" settings are OFF

**CloudFront not showing updates?**
- Did you invalidate the cache?
- Remember: distributions take 10-15 min to deploy changes

**Domain not working?**
- DNS takes time (5-60 minutes)
- Check Route 53 records are correct
- Make sure CloudFront has the alternate domain name

**SSL certificate not validating?**
- Must be in us-east-1 region for CloudFront
- Check Route 53 has validation CNAME records
- Wait 10-15 minutes

---

## Next Steps

Head to [Lesson 2: Renting Computers](../lesson-02-renting-computers/) when you're ready to run actual code on AWS servers!

But first, take a moment to appreciate what you built:
- Your own website
- On AWS infrastructure
- With global CDN
- With HTTPS
- Monitored and secure

**Not bad for Lesson 1!** 🚀

---

## Notes

Use the space below (or `notes.md`) to jot down things you learned, questions you have, or ideas for your next project:

```
Your notes here...
```
