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
    
    {% for post in portfolio_posts %}
      <a href="{{ post.url | relative_url }}" class="portfolio-item">
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
}

@media (min-width: 769px) {
  .portfolio-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>