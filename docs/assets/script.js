// Simple enhancements for the AWS learning site

document.addEventListener('DOMContentLoaded', () => {
  // Initialize syntax highlighting
  if (typeof hljs !== 'undefined') {
    // Register Terraform language if available
    if (typeof hljsDefineTerraform !== 'undefined') {
      hljs.registerLanguage('terraform', hljsDefineTerraform);
    }
    hljs.highlightAll();
  }

  // Add mobile menu toggle
  addMobileMenuToggle();

  // Add copy buttons to code blocks
  addCopyButtons();

  // Add tooltips to AWS service badges
  addServiceBadgeTooltips();

  // Enable keyboard navigation
  enableKeyboardNav();

  // Initialize Learn More collapsible boxes
  initLearnMoreToggles();
});

function addMobileMenuToggle() {
  // Add hamburger menu for mobile
  if (window.innerWidth <= 1024) {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');

    if (sidebar && content) {
      const menuButton = document.createElement('button');
      menuButton.innerHTML = '☰ Menu';
      menuButton.style.cssText = `
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 101;
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: var(--shadow);
      `;

      menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      document.body.appendChild(menuButton);

      // Close sidebar when clicking outside
      content.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }
  }
}

function addCopyButtons() {
  // Add copy button to code blocks
  document.querySelectorAll('pre code').forEach(block => {
    const button = document.createElement('button');
    button.textContent = 'Copy';
    button.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.8em;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    `;

    const pre = block.parentElement;
    pre.style.position = 'relative';

    pre.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
    });

    pre.addEventListener('mouseleave', () => {
      button.style.opacity = '0';
    });

    button.addEventListener('click', async () => {
      const code = block.textContent;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    pre.appendChild(button);
  });
}

function enableKeyboardNav() {
  // Keyboard navigation: Arrow keys to navigate
  document.addEventListener('keydown', (e) => {
    // Alt+Left = Previous step
    if (e.altKey && e.key === 'ArrowLeft') {
      const prevButton = document.querySelector('.step-navigation .btn-secondary');
      if (prevButton) prevButton.click();
    }

    // Alt+Right = Next step
    if (e.altKey && e.key === 'ArrowRight') {
      const nextButton = document.querySelector('.step-navigation .btn-primary');
      if (nextButton) nextButton.click();
    }
  });
}

// Smooth scroll to anchor links (run after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Initialize Learn More collapsible boxes
function initLearnMoreToggles() {
  document.querySelectorAll('.learn-more').forEach(box => {
    const header = box.querySelector('.learn-more-header');

    if (header) {
      // Make header keyboard accessible
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'false');

      // Click handler
      header.addEventListener('click', () => {
        toggleLearnMore(box, header);
      });

      // Keyboard handler (Enter or Space)
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleLearnMore(box, header);
        }
      });
    }
  });
}

function toggleLearnMore(box, header) {
  const isExpanded = box.classList.contains('expanded');
  box.classList.toggle('expanded');
  header.setAttribute('aria-expanded', !isExpanded);
}

// Add tooltips to AWS service badges
function addServiceBadgeTooltips() {
  const serviceDescriptions = {
    'S3': 'Simple Storage Service - Object storage for files and static website hosting',
    'EC2': 'Elastic Compute Cloud - Virtual servers in the cloud',
    'Lambda': 'Serverless compute - Run code without managing servers',
    'DynamoDB': 'NoSQL database - Fast, flexible key-value and document database',
    'IAM': 'Identity and Access Management - Control access to AWS services',
    'ECS': 'Elastic Container Service - Run and manage Docker containers',
    'ECR': 'Elastic Container Registry - Store and manage Docker images',
    'ALB': 'Application Load Balancer - Distribute traffic across multiple targets',
    'CloudFront': 'Content Delivery Network - Deliver content with low latency globally',
    'Route53': 'DNS service - Domain registration and DNS routing',
    'RDS': 'Relational Database Service - Managed relational databases',
    'ElastiCache': 'In-memory caching - Managed Redis or Memcached',
    'SNS': 'Simple Notification Service - Pub/sub messaging',
    'SQS': 'Simple Queue Service - Message queuing service',
    'EventBridge': 'Event bus - Connect applications using events',
    'Kinesis': 'Real-time data streaming - Process streaming data at scale',
    'Firehose': 'Data delivery - Load streaming data into data stores',
    'Glue': 'ETL service - Extract, transform, and load data',
    'Athena': 'Query service - SQL queries on data in S3',
    'Rekognition': 'Image and video analysis - Computer vision service',
    'Comprehend': 'Natural language processing - Text analysis and insights',
    'Translate': 'Language translation - Neural machine translation',
    'Bedrock': 'Foundation models - Build and scale generative AI applications',
    'CloudWatch': 'Monitoring and observability - Metrics, logs, and alarms',
    'CloudWatch Logs': 'Log management - Store and analyze log files',
    'X-Ray': 'Distributed tracing - Debug and analyze microservices',
    'API Gateway': 'API management - Create, publish, and manage APIs',
    'Secrets Manager': 'Secret storage - Rotate and manage secrets',
    'STS': 'Security Token Service - Temporary security credentials',
    'VPC': 'Virtual Private Cloud - Isolated cloud network',
    'CloudFormation': 'Infrastructure as code - Provision AWS resources with templates'
  };

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'aws-tooltip';
  document.body.appendChild(tooltip);

  const badges = document.querySelectorAll('.code-service-badge');

  badges.forEach((badge) => {
    const serviceName = badge.textContent.trim();
    const description = serviceDescriptions[serviceName];

    if (description) {
      badge.setAttribute('data-tooltip', description);
      badge.setAttribute('aria-label', description);

      // Show tooltip on hover
      badge.addEventListener('mouseenter', (e) => {
        const rect = badge.getBoundingClientRect();
        tooltip.textContent = description;
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';

        // Position above the badge
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 12}px`;
      });

      // Hide tooltip on mouse leave
      badge.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
      });
    }
  });
}
