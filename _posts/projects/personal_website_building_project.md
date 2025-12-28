---
title: "How I built a custom portfolio website with no experience"
date: 2025-12-27 20:09:00 -0600
categories: [Project]
tags: [Web Development, Networking, Coding, HTML, CSS, JavaScript, CI/CD, GitHub, UI/UX]
thumbnail_image:
  path: /assets/img/personal_website_project/thumbnail.webp
  alt: thumbnail image
pin: true
excerpt: "Building this website from scratch!"
---
<figure>
   <img src="/assets/img/personal_website_project/thumbnail.webp" alt="Description">  
 </figure>

## Overview

I was inspired by Jeff Geerling, a popular dev and content creator, to create a portfolio website to showcase my hobbies and projects. Around the same time, I was thinking about an alternate platform than Instagram for displaying my photography. I decided to dive in and make a personal website of my own. I thought it would be fitting to write the first project post about my experience.


## 1. Core Architecture & Configuration

Like the title says, I had little to no knowledge of building a website, other than some experience with Squarespace. Being a broke college student, I don't have the funds for a domain or a subscription to a website builder, so I wanted to do it manually. I decided to host a website on **GitHub Pages**, as I am okay with the `example.github.io` domain and I have total control of everything.

The site is built on **Jekyll** using a very heavily modified version of the **Chirpy** theme. The template was great as a platform for a blog website, but I wanted to showcase both my projects and photography portfolio separately. Chirpy's repo is available [here](https://github.com/cotes2020/jekyll-theme-chirpy) if you would like to make your own fork.

My initial challenge came from figuring out Chirpy's defaults and changing them to fit my ideas, specifically with how it handles posts, layouts, and images.

* **Asset Management:**
    * **Problem:** The theme defaulted to a CDN (`chirpy-img.netlify.app`) for images, breaking local assets on deployment.
    * **Fix:** Disabled `img_cdn` in `_config.yml` and enforced absolute pathing for all media to ensure correct loading on nested sub-pages.
* **File Naming Protocol:**
    * **Problem:** Jekyll's strict dependency on filenames caused build crashes ("collision errors") when multiple posts shared the same slug.
    * **Fix:** Established a strict `YYYY-MM-DD-unique-slug.md` convention to prevent URL conflicts.

## 2. The Projects Dashboard
I wanted the Projects tab (`/projects`) to feel like a workspace, not a feed. I wiped the default layout and built a custom dashboard.

* **The Folder Browser:**
    * Implemented a hierarchical category browser at the top of the page.
    * **Logic:** It automatically scans site categories but filters out "Photography" to keep the engineering workspace clean.
    * **UI/UX:** Added custom JavaScript to handle arrow rotation and corner rounding animations when folders expand/collapse.
* **Recent Projects Feed:**
    * Created a custom Liquid loop to fetch the 10 most recent posts.
    * **Filtering:** Scans the entire site but explicitly excludes the "Photography" category.
    * **Visuals:** Changed the tab icon to a Wrench (`fa-wrench`) and utilized wide-format cards for better readability.

## 3. The Photography Portfolio
The Portfolio tab (`/portfolio`) needed to be purely visual. I iterated through Masonry and Vertical layouts before settling on an **Instagram-Style Grid**.

* **Grid Specs:**
    * **Layout:** A strict 3-column grid (`row-cols-3`) that persists on mobile and desktop.
    * **Square Crop:** Utilized CSS `aspect-ratio: 1/1` and `object-fit: cover` to force every thumbnail into a perfect square without distortion, regardless of the source aspect ratio.
* **Aesthetic Choices:**
    * Removed all border-radius (`border-radius: 0 !important`) for a sharp, tiled mosaic look.
    * Added a hover overlay with an icon on desktop to indicate clickability.
* **Content Behavior:**
    * Clicking a tile opens the full post, which utilizes **Bootstrap Carousels** to allow swiping through multiple images within a single project entry.

## 4. Home Page Logic
The home page was split into two distinct sections to reflect the dual nature of the site.

* **Section 1: Recent Projects:**
    * Displays engineering work with standard excerpts and metadata.
    * Includes logic to handle missing thumbnails by rendering empty wrappers to maintain grid alignment.
* **Section 2: Recent Photos:**
    * Mirrors the Portfolio's 3-column square grid.
    * **Smart Icons:** Added logic to detect multi-image posts and append a "Layer Group" icon (`fa-layer-group`) to the thumbnail, indicating a gallery.
* **Performance Fix:**
    * Added a JavaScript listener to the "Shimmer" loading effect to forcibly remove the placeholder class once the `img` tag reports a "loaded" state, preventing stuck gray boxes.

## 5. Global Design System
To make the site feel unique, I overrode the theme's soft, rounded default styling.

* **Typography:** Switched the global font family to **Space Grotesk** for a modern, technical feel.
    * *Mobile Fix:* Manually targeted the mobile breadcrumb IDs in Sass to force the font update on iOS devices.
* **The "Sharp" Aesthetic:**
    * Implemented a global CSS override to remove rounded corners from all images and containers site-wide.
* **Sidebar & Archive:**
    * Customized the sidebar avatar to be square.
    * Built a custom **Yearly Archive** widget that appears on the sidebar of Home, Projects, and Post pages for easy temporal navigation.

## 6. CI/CD Pipeline & Troubleshooting
The deployment process required debugging the GitHub Actions workflow.

* **HTML Proofer Failure:**
    * **Issue:** The build pipeline was failing during the `htmlproofer` check due to an invalid flag (`--check-html`) and false positives on internal anchors.
    * **Fix:** Rewrote the `tools/test` script to remove the deprecated flag and configured the proofer to ignore specific internal URL patterns (localhost, tags, categories), ensuring green builds on every push.

---
*This site is continuously evolving. View the source code on [GitHub](https://github.com/lukegoldmeyer/lukegoldmeyer.github.io).*