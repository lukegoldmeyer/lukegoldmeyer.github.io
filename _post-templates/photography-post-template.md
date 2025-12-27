---
# ============================================
# PHOTOGRAPHY POST TEMPLATE
# ============================================
# 
# INSTRUCTIONS:
# 1. Copy this entire file to the _posts/ directory
# 2. Rename it to anything you want (e.g., sunset-landscape.md)
#    - The filename does NOT need to include the date
#    - The filename does NOT need to match the title
#    - Just use any descriptive name ending in .md
# 3. Fill in all the fields below (remove comments/instructions)
# 4. Write your content after the --- separator
#
# ============================================

title: "Your Photo Title Here"
# REQUIRED: The title of your photography post
# This will be used for the URL slug: /posts/your-photo-title-here/
# Example: "Mountain Sunset at Golden Hour"

date: YYYY-MM-DD HH:MM:SS -0600
# REQUIRED: Publication date and time
# Format: YYYY-MM-DD HH:MM:SS -0600 (adjust timezone as needed)
# Example: 2025-01-20 18:00:00 -0600
# Note: The date in the filename is NOT used - only this field matters

categories: [Photo]
# REQUIRED: Must include "Photo" as the category
# You can add additional subcategories if desired:
#   categories: [Photo, Portrait]
#   categories: [Photo, Landscape, Nature]
# Note: Only "Photo" category posts appear on the Portfolio page

tags: [Tag1, Tag2]
# OPTIONAL: Add tags for photo type, location, style, etc.
# Examples:
#   tags: [Portrait, Studio, People]
#   tags: [Landscape, Nature, Scenic]
#   tags: [Street, Urban, Black and White]
# Note: Tags are displayed on the Portfolio page and can be clicked to filter

thumbnail_image:
  path: /assets/img/your-thumbnail.jpg
  alt: Description of the thumbnail image
# OPTIONAL: Thumbnail shown on Portfolio page and home page
# - If NOT specified, no thumbnail will be shown on listing pages
# - path: Full path from site root (usually /assets/img/filename.jpg)
# - alt: Descriptive text for accessibility
# Example:
#   thumbnail_image:
#     path: /assets/img/sunset-thumb.jpg
#     alt: Mountain sunset thumbnail
# 
# NOTE: Do NOT use the 'image' field in front matter.
#       Insert images directly in your post content using Markdown or HTML.
#       You can create your own gallery by inserting multiple images in your content.

---
# ============================================
# POST CONTENT STARTS BELOW
# ============================================
# 
# Write your photography post content here using Markdown.
# 
# MARKDOWN GUIDE:
# - Headers: # H1, ## H2, ### H3, etc.
# - Bold: **bold text**
# - Italic: *italic text*
# - Links: [link text](https://url.com)
# - Lists: Use - or * for bullet points
# 
# INSERTING IMAGES WITH CAPTIONS:
# Use HTML figure tags for images with captions:
# 
# <figure>
#   <img src="/assets/img/my-photo.jpg" alt="Description">
#   <figcaption>Your caption text here</figcaption>
# </figure>
# 
# For images without captions, use regular Markdown:
# ![Alt text](/assets/img/my-photo.jpg)
# 
# CREATING YOUR OWN GALLERY:
# Simply insert multiple images in your content. You can arrange them
# however you want - vertically, with captions, etc.
# 
# Example gallery:
# 
# <figure>
#   <img src="/assets/img/photo1.jpg" alt="First photo">
#   <figcaption>First photo in the series</figcaption>
# </figure>
# 
# <figure>
#   <img src="/assets/img/photo2.jpg" alt="Second photo">
#   <figcaption>Second photo in the series</figcaption>
# </figure>
# 
# CONTENT SUGGESTIONS:
# - Location/Setting
# - Camera Settings (ISO, aperture, shutter speed)
# - Equipment Used
# - Shooting Conditions
# - Post-Processing Notes
# - Story or Context
#
# ============================================

## Location

Where was this photo taken?

## Camera Settings

- **ISO**: 
- **Aperture**: 
- **Shutter Speed**: 
- **Focal Length**: 

## Equipment

- Camera:
- Lens:
- Other gear:

## Notes

Add any additional context, thoughts, or technical details about the photo(s).

## Gallery

Insert your photos here with captions:

<figure>
  <img src="/assets/img/photo1.jpg" alt="First photo">
  <figcaption>Caption for first photo</figcaption>
</figure>

<figure>
  <img src="/assets/img/photo2.jpg" alt="Second photo">
  <figcaption>Caption for second photo</figcaption>
</figure>
