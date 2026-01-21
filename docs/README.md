# AWS Learning Journey - Interactive Website

This is the static website version of the AWS learning tutorials, designed for an engaging, interactive learning experience.

## Features

- **Interactive Navigation**: Click through lessons step-by-step
- **Visual Progress Tracking**: See exactly where you are in each lesson
- **Table of Contents**: Navigate directly to any section
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Copy Code Buttons**: Easily copy code snippets to clipboard
- **Keyboard Navigation**: Use `Alt+Left/Right` to navigate between steps
- **Template-based Build System**: Update navigation once, rebuild all 74 files instantly

## Structure

```
docs/
├── build/                     # Build system (isolated)
│   ├── eleventy.config.js    # Eleventy configuration
│   ├── package.json          # Build scripts
│   └── node_modules/         # Dependencies
├── src/                       # Source templates
│   ├── _includes/            # Layouts and components
│   │   ├── lesson-layout.njk
│   │   └── partials/
│   ├── _data/                # Site data (lessons.json)
│   └── lessons/              # 74 lesson templates (.njk)
├── lessons/                   # 74 generated HTML files
├── assets/                    # CSS, JS, images
└── index.html                # Generated homepage
```

## Viewing the Site

Simply open `index.html` in any modern web browser. No server required!

## Build System

This site uses **Eleventy (11ty)** to generate static HTML from templates, allowing you to:
- Update navigation across all 74 files by editing one JSON file
- Share layouts and components to eliminate duplication
- Rebuild everything in ~0.1 seconds

### Quick Build Commands

```bash
# Build all HTML files from templates
cd build
npm run build

# Development with live reload at http://localhost:8080
cd build
npm run watch
```

### Edit a Lesson

1. Edit template in `src/lessons/lesson-XX-Y.njk`
2. Run `cd build && npm run build`
3. View generated file in `lessons/lesson-XX-Y.html`

### Update Navigation Site-Wide

1. Edit `src/_data/lessons.json`
2. Run `cd build && npm run build`
3. All 74 lesson files updated instantly

### Change Site Layout

1. Edit `src/_includes/lesson-layout.njk` or partials
2. Run `cd build && npm run build`
3. All pages get the new layout

## Current Status

✅ All 12 lessons complete (74 HTML pages)
✅ Template-based build system configured
✅ Consistent navigation across all pages

## Deploying

Since this is a static site, you can deploy it anywhere:

- **GitHub Pages**: Push to `gh-pages` branch
- **Netlify**: Drag and drop the `docs` folder
- **AWS S3**: Use what you learned in Lesson 1!
- **Vercel**: Connect your repo

Just deploy the generated HTML files (the `lessons/` directory and `index.html`). The `build/` and `src/` directories are only needed for making changes.

## Customization

### Colors

Edit `assets/style.css` and change the CSS variables:

```css
:root {
  --primary-color: #FF9900;  /* AWS Orange */
  --secondary-color: #232F3E; /* AWS Dark Blue */
  --accent-color: #146EB4;    /* Link Blue */
}
```

### Typography

Change the font-family in the `body` selector in `style.css`.

### Layout

Adjust `--sidebar-width` in CSS variables to change sidebar size.

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

## Template Structure

Each lesson template has front matter (metadata) and content:

```njk
---
layout: lesson-layout.njk
permalink: lessons/lesson-01.html
lessonNumber: 1
lessonTitle: Your First Internet Empire
duration: ~6 hours
cost: $1-2
stepNumber: 1
totalSteps: 8
progress: 12.5
title: "Lesson 1: Your First Internet Empire"
tocContent: |
  <li class="active">
    <a href="lesson-01.html">
      <span class="step-number">1</span>
      <span class="step-title">Overview</span>
    </a>
  </li>
---

<div class="step-header">
  <span class="step-badge">Lesson 1 - Part 1</span>
  <h1>Your First Internet Empire</h1>
</div>

<div class="step-content">
  <!-- Lesson content -->
</div>
```

## Learn More

- [Eleventy Documentation](https://www.11ty.dev/docs/)
- [Nunjucks Template Syntax](https://mozilla.github.io/nunjucks/templating.html)

## License

MIT - Feel free to use and modify!
