---
layout: default
title: Portfolio
icon: fas fa-camera-retro
order: 3
---

<div class="portfolio-container">
  <div class="portfolio-header">
    <h1 class="portfolio-title">{{ site.title }}</h1>
    <p class="portfolio-subtitle">Photography</p>
    <div class="portfolio-stats">
      <span class="stat-number">{{ site.categories.Photo | size }}</span>
      <span class="stat-label">posts</span>
    </div>
  </div>

  <div class="portfolio-grid">
    {% assign portfolio_posts = site.categories.Photo %}
    
    {% comment %} 1. Filter posts into Pinned and Unpinned {% endcomment %}
    {% assign pinned_posts = portfolio_posts | where: "pin", true %}
    {% assign unpinned_posts = portfolio_posts | where_exp: "item", "item.pin != true" %}
    
    {% comment %} 2. Combine arrays: Pinned posts first {% endcomment %}
    {% assign sorted_posts = pinned_posts | concat: unpinned_posts %}
    
    {% for post in sorted_posts %}
      <a href="{{ post.url | relative_url }}" class="portfolio-item">
        
        {% comment %} Optional: Pin Indicator Icon {% endcomment %}
        {% if post.pin %}
        <div class="pin-indicator">
          <i class="fas fa-thumbtack"></i>
        </div>
        {% endif %}

        {% if post.thumbnail_image %}
          {% assign src = post.thumbnail_image.path | default: post.thumbnail_image %}
          <img src="{{ src | relative_url }}" 
               alt="{{ post.thumbnail_image.alt | default: post.title }}" 
               class="portfolio-image"
               loading="lazy"
               decoding="async">
        {% elsif post.image %}
          {% assign src = post.image.path | default: post.image %}
          <img src="{{ src | relative_url }}" 
               alt="{{ post.image.alt | default: post.title }}" 
               class="portfolio-image"
               loading="lazy"
               decoding="async">
        {% endif %}
        
        <div class="portfolio-overlay">
          <i class="fas fa-search-plus fa-2x"></i>
        </div>
      </a>
    {% endfor %}
  </div>
</div>

<style>
.portfolio-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.portfolio-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--main-border-color);
}

.portfolio-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--heading-color);
}

.portfolio-subtitle {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted-color);
  margin-bottom: 1rem;
}

.portfolio-description {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  color: var(--text-color);
  line-height: 1.6;
}

.portfolio-stats {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--heading-color);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted-color);
  text-transform: lowercase;
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2px;
  margin: 0;
}

.portfolio-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--img-bg);
  display: block;
  border-radius: 0 !important;
}

/* --- Pin Indicator Styles --- */
.pin-indicator {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  pointer-events: none; /* Allows clicks to pass through to the link */
}

.pin-indicator i {
  font-size: 0.9rem;
  transform: rotate(30deg); /* Angled look */
}

.portfolio-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 0 !important;
  transition: transform 0.3s ease, filter 0.3s ease;
  /* Ensure no compression - use original quality */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.portfolio-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 0 !important;
}

.portfolio-overlay i {
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.portfolio-item:hover .portfolio-overlay {
  opacity: 1;
}

.portfolio-item:hover .portfolio-image {
  transform: scale(1.05);
  filter: brightness(0.9);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .portfolio-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
  }
  
  .portfolio-title {
    font-size: 2rem;
  }
  
  .portfolio-container {
    padding: 1rem 0.5rem;
  }

  /* Scale down the pin on mobile */
  .pin-indicator {
    width: 22px;
    height: 22px;
    top: 0.4rem;
    right: 0.4rem;
  }
  
  .pin-indicator i {
    font-size: 0.7rem;
  }
}

@media (min-width: 769px) {
  .portfolio-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>