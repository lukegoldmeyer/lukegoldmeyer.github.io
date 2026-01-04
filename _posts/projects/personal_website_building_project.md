---
title: "How I built a custom portfolio website with no experience"
date: 2025-12-27 20:09:00 -0600
categories: [Project]
tags: [Web Development, Networking, Coding, HTML, CSS, JavaScript, CI/CD, GitHub, UI/UX]
thumbnail_image:
  path: /assets/img/personal_website_project/thumbnail.webp
  alt: thumbnail image

excerpt: "Building this website from scratch!"
---
<figure>
   <img src="/assets/img/personal_website_project/thumbnail.webp" alt="Description">  
 </figure>

## Overview

I was inspired by Jeff Geerling, a popular dev and content creator, to create a portfolio website to showcase my hobbies and projects. Around the same time, I was thinking about an alternate platform to Instagram for displaying my photography. I decided to dive in and make a personal website of my own. I thought it would be fitting to write the first project post about my experience.


## 1. Core Architecture & Configuration

I had little to no knowledge of building a website going into this, other than some experience with Squarespace. As a broke college student I don't have the funds for a domain or a subscription to a website builder, so I wanted to do it manually. I decided to host a website on **GitHub Pages**, as I am okay with the `example.github.io` domain and have total control of everything.

The site is built on **Jekyll** using a very heavily modified version of the **Chirpy** theme. The template was great as a platform for a blog website, but I wanted to showcase both my projects and photography portfolio separately. Chirpy's repo is available [here](https://github.com/cotes2020/jekyll-theme-chirpy) if you would like to make your own fork.

**Note:** Chirpy has two GitHub Repositories, the **Starter** and the **Main.** I initially tried cloning Chirpy Starter, which is designed for ease of use. It hides the core files behind a Ruby Gem to keep the repository clean. However, I wanted to change the CSS and layout pretty heavily, and I learned the hard way that I needed the main. If you intend to create something similar, make sure you know what you need from the template.

The biggest challenge came from figuring out Chirpy's defaults and changing them to fit my ideas, specifically with how it handles posts, layouts, and media. Chirpy defaulted to a CDN (`chirpy-img.netlify.app`) for sourcing images, so I disabled `img_cdn` in `_config.yml` and enforced absolute pathing for all media to make sure every image loads correctly. 

The sidebar on the right that shows recently updated projects and trending tags needed to be changed to show only projects or photos depending on which page is viewed. For example, this is a project page, so the sidebar shouldn't show any recents or tags related to photo posts. I had to change the logic in `_sidebar.html` to check for a post category to determine what to show.

## 2. Projects Dashboard
I wanted the Projects tab to feel similar to the blog feed, but I made the tiles bigger. I also wanted to filter out everything that wasn't in the `Projects` category so the focus is purely what I am working on. Chirpy didn't have the filter logic in place, so I had to create a system that only displays projects in the projects page. I also created a custom Liquid loop to fetch and show the 10 most recent posts. The projects dashboard scans the entire site but explicitly excludes the "Photography" category and includes the "Projects" category. Tags are also specific to project posts and are shown on the right, so anyone can pick a topic at a glance.
    

## 3. Photography Portfolio
Chirpy had no semblance of a photo gallery page, so I had to make it myself. The Portfolio tab needed to be purely visual. I tried masonry and vertical feed layouts, but i finally decided to copy **Instagram**'s profile page for a nice and rigid grid. Each post is its own page, but it is filtered out by the category "Photo". I built the grid with (`row-cols-3`) to keep it at 3 columns. Using CSS, I made `aspect-ratio: 1/1` and `object-fit: cover` to force every thumbnail into a perfect square without distortion, regardless of the source aspect ratio. Chirpy's photo processing defauts to adding a corner radius to every photo, but for the grid I wanted straight corners. I removed all border-radius (`border-radius: 0 !important`) to display photos in a more professional manner. Finally, I added a hover overlay with an icon on desktop to indicate clickability, as well as an icon that signifies a post with multiple photos, similar to what can be seen on Instagram.


## 4. Home Page Logic
I wanted to split the home page into two sections to accurately show the dual nature of the site. 

* Recent projects displays each project post with standard excerpts and metadata. The section also includes logic to handle missing thumbnails by rendering posts as a smaller icon that nestles into the grid correctly.
* The Recent Photos section mirrors the Portfolio's 3-column square grid.
    
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


The site also natively has support for a number of nice formatting features. Code blocks can be added, making it easy to copy code or shell commands:
```bash
sudo rm -rf --no-preserve-root #do not run this. it WILL destroy your system.
```

---
*This site is continuously evolving. View the source code on [GitHub](https://github.com/lukegoldmeyer/lukegoldmeyer.github.io).*