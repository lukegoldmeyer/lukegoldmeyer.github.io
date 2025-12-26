---
layout: default
title: Projects
icon: fas fa-code
order: 2
---

{% include lang.html %}

<div class="projects-container">
  <h1 class="dynamic-title mb-4">Projects</h1>
  
  <div class="projects-list">
    {% for post in site.posts %}
      {% if post.categories contains 'Project' %}
        <article class="project-card">
          <a href="{{ post.url | relative_url }}" class="project-card-link">
            {% if post.thumbnail_image %}
              <div class="project-image-wrapper">
                {% assign src = post.thumbnail_image.path | default: post.thumbnail_image %}
                {% assign alt = post.thumbnail_image.alt | xml_escape | default: 'Project Thumbnail' %}
                <img src="{{ src | relative_url }}" alt="{{ alt }}" class="project-image">
              </div>
            {% endif %}
            <div class="project-content">
              <h2 class="project-title">{{ post.title }}</h2>
              <div class="project-description">
                {% if post.excerpt %}
                  {{ post.excerpt }}
                {% elsif post.thumbnail_caption %}
                  {{ post.thumbnail_caption }}
                {% else %}
                  {% include post-summary.html max_length=200 %}
                {% endif %}
              </div>
              <div class="project-footer">
                <div class="project-meta">
                  <i class="far fa-calendar fa-fw"></i>
                  {% include datetime.html date=post.date lang=lang %}
                </div>
                {% if post.tags.size > 0 %}
                  <div class="project-tags">
                    {% for tag in post.tags %}
                      <a href="{{ site.baseurl }}/tags/{{ tag | slugify | url_encode }}/" class="project-tag">
                        {{ tag }}
                      </a>
                    {% endfor %}
                  </div>
                {% endif %}
              </div>
            </div>
          </a>
        </article>
      {% endif %}
    {% endfor %}
  </div>
</div>

<style>
.projects-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 2rem;
}

.project-card {
  background: var(--card-bg);
  border: 1px solid var(--btn-border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: var(--card-shadow);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--link-color);
}

.project-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.project-image-wrapper {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: var(--img-bg);
}

.project-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.project-card:hover .project-image {
  transform: scale(1.03);
}

.project-content {
  padding: 1.5rem;
}

.project-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--heading-color);
  line-height: 1.3;
}

.project-description {
  color: var(--text-color);
  line-height: 1.6;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--main-border-color);
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted-color);
}

.project-meta i {
  font-size: 0.85rem;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-tag {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: var(--sidebar-bg);
  border: 1px solid var(--btn-border-color);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-color);
  text-decoration: none;
  transition: all 0.2s ease;
}

.project-tag:hover {
  background: var(--card-hover-bg);
  border-color: var(--link-color);
  color: var(--link-color);
}

@media (max-width: 768px) {
  .projects-container {
    padding: 1rem;
  }
  
  .project-content {
    padding: 1.5rem;
  }
  
  .project-title {
    font-size: 1.5rem;
  }
  
  .project-image-wrapper {
    height: 180px;
  }
  
  .project-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>