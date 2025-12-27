---
# ============================================
# PROJECT POST TEMPLATE
# ============================================
# 
# INSTRUCTIONS:
# 1. Copy this entire file to the _posts/ directory
# 2. Rename it to anything you want (e.g., my-project.md)
#    - The filename does NOT need to include the date
#    - The filename does NOT need to match the title
#    - Just use any descriptive name ending in .md
# 3. Fill in all the fields below (remove comments/instructions)
# 4. Write your content after the --- separator
#
# ============================================

title: "Your Project Title Here"
# REQUIRED: The title of your project
# This will be used for the URL slug: /posts/your-project-title-here/
# Example: "Robot Arm Control System v2"

date: YYYY-MM-DD HH:MM:SS -0600
# REQUIRED: Publication date and time
# Format: YYYY-MM-DD HH:MM:SS -0600 (adjust timezone as needed)
# Example: 2025-01-15 14:30:00 -0600
# Note: The date in the filename is NOT used - only this field matters

categories: [Project]
# REQUIRED: Must include "Project" as the first category
# You can add additional subcategories if desired:
#   categories: [Project, Robotics]
#   categories: [Project, Web Development]
#   categories: [Project, Electronics, Arduino]
# Note: Only "Project" category posts appear on the Projects page

tags: [Tag1, Tag2, Tag3]
# OPTIONAL: Add tags for technologies, topics, or themes
# Examples:
#   tags: [Python, Flask, API, Backend]
#   tags: [Arduino, Electronics, Robotics, 3D Printing]
#   tags: [React, TypeScript, Web Development]
# Note: Tags are displayed on the Projects page and can be clicked to filter

thumbnail_image:
  path: /assets/img/your-thumbnail.jpg
  alt: Description of the thumbnail image
# OPTIONAL: Thumbnail shown on Projects page and home page
# - If NOT specified, the project tile will have NO image (takes up less space)
# - If specified, the project tile will show this image (takes up more space)
# - path: Full path from site root (usually /assets/img/filename.jpg)
# - alt: Descriptive text for accessibility
# Example:
#   thumbnail_image:
#     path: /assets/img/robot-arm-thumb.jpg
#     alt: Robot arm thumbnail preview
# 
# NOTE: Do NOT use the 'image' field in front matter.
#       Insert images directly in your post content using Markdown or HTML.

excerpt: "Custom caption that appears in the project thumbnail on listing pages."
# OPTIONAL: Short description shown on Projects page and home page
# - If left blank, a summary will be auto-generated from your post content
# - Keep it concise (1-2 sentences recommended)
# - This appears ONLY in thumbnails, NOT on the full post page
# Example: "A 6-DOF robotic arm controlled via Arduino with inverse kinematics"

---
# ============================================
# POST CONTENT STARTS BELOW
# ============================================
# 
# Write your full project post content here using Markdown.
# 
# MARKDOWN GUIDE:
# - Headers: # H1, ## H2, ### H3, etc.
# - Bold: **bold text**
# - Italic: *italic text*
# - Links: [link text](https://url.com)
# - Lists: Use - or * for bullet points, 1. 2. 3. for numbered
# - Code: `inline code` or ```language for code blocks
# 
# INSERTING IMAGES WITH CAPTIONS:
# Use HTML figure tags for images with captions:
# 
# <figure>
#   <img src="/assets/img/my-image.jpg" alt="Description">
#   <figcaption>Your caption text here</figcaption>
# </figure>
# 
# For images without captions, use regular Markdown:
# ![Alt text](/assets/img/my-image.jpg)
# 
# You can insert images anywhere in your post content.
# 
# CONTENT SUGGESTIONS:
# - Overview/Introduction
# - Features
# - Technical Details
# - Code Examples (use code blocks)
# - Challenges and Solutions
# - Future Improvements
# - Conclusion
#
# ============================================

## Overview

Write a brief overview of your project here.

## Features

- Feature one
- Feature two
- Feature three

## Technical Details

Add technical information, specifications, or architecture details.

## Code Example

```python
# Example code block
def example_function():
    print("Hello, World!")
    return True
```

## Images

You can insert images anywhere in your content:

<figure>
  <img src="/assets/img/example.jpg" alt="Example image">
  <figcaption>This is a caption that appears below the image</figcaption>
</figure>

Or without a caption:

![Alt text](/assets/img/example.jpg)

## Challenges

Describe any challenges you faced and how you solved them.

## Future Improvements

List planned improvements or next steps.

## Conclusion

Wrap up your post with final thoughts.
