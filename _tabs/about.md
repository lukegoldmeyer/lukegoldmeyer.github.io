---
layout: page
title: About
icon: fas fa-info-circle
order: 4
---

<div class="about-container">
  <div class="about-content">
    <!-- Photo Section -->
    <div class="about-photo-section">
      <img src="/assets/img/Luke-65edit.jpg" alt="Luke Goldmeyer" class="about-photo">
    </div>

    <!-- Bio Section -->
    <div class="about-bio-section">
      <h2>About Me</h2>
      <p class="about-bio">
        I am an engineering student, developer, photographer, musician, and cyclist. 
        I love building things, solving problems, and capturing moments through photography.
      </p>
    </div>

    <!-- Contact & Social Links -->
    <div class="about-contact-section">
      <h3>Get in Touch</h3>
      <div class="contact-info">
        <div class="contact-item">
          <i class="fas fa-envelope"></i>
          <a href="mailto:goldmeyerluke@gmail.com">goldmeyerluke@gmail.com</a>
        </div>
      </div>

      <div class="social-links">
        <h4>Connect</h4>
        <div class="social-icons">
          <a href="https://www.instagram.com/lukegoldmeyer.arw" target="_blank" rel="noopener noreferrer" class="social-link">
            <i class="fab fa-instagram"></i>
            <span>Instagram</span>
          </a>
          <a href="https://github.com/lukegoldmeyer" target="_blank" rel="noopener noreferrer" class="social-link">
            <i class="fab fa-github"></i>
            <span>GitHub</span>
          </a>
          <a href="https://www.linkedin.com/in/lukegoldmeyer" target="_blank" rel="noopener noreferrer" class="social-link">
            <i class="fab fa-linkedin"></i>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 0;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.about-photo-section {
  text-align: center;
}

.about-photo {
  width: 250px;
  height: 250px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--main-border-color);
  box-shadow: var(--card-shadow);
}

.about-bio-section h2 {
  margin-bottom: 1rem;
  color: var(--heading-color);
}

.about-bio {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text-color);
}

.about-contact-section h3 {
  margin-bottom: 1.5rem;
  color: var(--heading-color);
}

.about-contact-section h4 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--heading-color);
  font-size: 1.1rem;
}

.contact-info {
  margin-bottom: 1rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
}

.contact-item i {
  color: var(--text-muted-color);
  width: 20px;
  text-align: center;
}

.contact-item a {
  color: var(--link-color);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.contact-item a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.social-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.social-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--card-bg);
  border: 1px solid var(--btn-border-color);
  border-radius: 12px;
  color: var(--text-color);
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: var(--card-shadow);
}

.social-link:hover {
  background: var(--card-hover-bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: var(--text-color);
}

.social-link i {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .about-photo {
    width: 200px;
    height: 200px;
  }
  
  .social-icons {
    flex-direction: column;
  }
  
  .social-link {
    width: 100%;
    justify-content: center;
  }
}
</style>