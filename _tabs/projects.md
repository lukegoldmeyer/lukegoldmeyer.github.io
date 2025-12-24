---
layout: default
title: Projects
icon: fas fa-code
order: 2
---

{% include lang.html %}

<div id="post-list" class="flex-grow-1 px-xl-1">

  <h1 class="dynamic-title ps-lg-2 mb-4">Categories</h1>

  <div id="category-list" class="mb-5">
    {% assign HEAD_PREFIX = 'h_' %}
    {% assign LIST_PREFIX = 'l_' %}
    {% assign group_index = 0 %}
    {% assign sort_categories = site.categories | sort %}

    {% for category in sort_categories %}
      {% assign category_name = category | first %}
      {% assign posts_of_category = category | last %}
      {% assign first_post = posts_of_category | first %}

      {% unless category_name == 'Photography' %}

        {% if category_name == first_post.categories[0] %}
          {% assign sub_categories = '' | split: '' %}
          {% for post in posts_of_category %}
            {% assign second_category = post.categories[1] %}
            {% if second_category %}
              {% unless sub_categories contains second_category %}
                {% assign sub_categories = sub_categories | push: second_category %}
              {% endunless %}
            {% endif %}
          {% endfor %}
          {% assign sub_categories = sub_categories | sort %}
          {% assign sub_categories_size = sub_categories | size %}

          <div class="card categories mb-3">
            <div id="{{ HEAD_PREFIX }}{{ group_index }}" class="card-header d-flex justify-content-between hide-border-bottom">
              <span class="ms-2">
                <i class="far fa-folder{% if sub_categories_size > 0 %}-open{% endif %} fa-fw"></i>

                {% capture _category_url %}/categories/{{ category_name | slugify | url_encode }}/{% endcapture %}
                <a href="{{ _category_url | relative_url }}" class="mx-2">{{ category_name }}</a>

                {% assign top_posts_size = site.categories[category_name] | size %}
                <span class="text-muted small font-weight-light">
                  {% if sub_categories_size > 0 %}
                    {{ sub_categories_size }}
                    {% if sub_categories_size > 1 %}
                      {{ site.data.locales[lang].categories.category_measure.plural | default: site.data.locales[lang].categories.category_measure }}
                    {% else %}
                      {{ site.data.locales[lang].categories.category_measure.singular | default: site.data.locales[lang].categories.category_measure }}
                    {% endif -%}
                    ,
                  {% endif %}

                  {{ top_posts_size }}

                  {% if top_posts_size > 1 %}
                    {{ site.data.locales[lang].categories.post_measure.plural | default: site.data.locales[lang].categories.post_measure }}
                  {% else %}
                    {{ site.data.locales[lang].categories.post_measure.singular | default: site.data.locales[lang].categories.post_measure }}
                  {% endif %}
                </span>
              </span>

              {% if sub_categories_size > 0 %}
                <a href="#{{ LIST_PREFIX }}{{ group_index }}" data-bs-toggle="collapse" aria-expanded="true" aria-label="{{ HEAD_PREFIX }}{{ group_index }}-trigger" class="category-trigger hide-border-bottom">
                  <i class="fas fa-fw fa-angle-down"></i>
                </a>
              {% else %}
                <span data-bs-toggle="collapse" class="category-trigger hide-border-bottom disabled">
                  <i class="fas fa-fw fa-angle-right"></i>
                </span>
              {% endif %}
            </div>

            {% if sub_categories_size > 0 %}
              <div id="{{ LIST_PREFIX }}{{ group_index }}" class="collapse show" aria-expanded="true">
                <ul class="list-group list-group-flush">
                  {% for sub_category in sub_categories %}
                    <li class="list-group-item">
                      <i class="far fa-folder fa-fw"></i>
                      {% capture _sub_ctg_url %}/categories/{{ sub_category | slugify | url_encode }}/{% endcapture %}
                      <a href="{{ _sub_ctg_url | relative_url }}" class="mx-2">{{ sub_category }}</a>
                      
                      {% assign posts_size = site.categories[sub_category] | size %}
                      <span class="text-muted small font-weight-light">
                        {{ posts_size }}
                        {% if posts_size > 1 %}
                          {{ site.data.locales[lang].categories.post_measure.plural | default: site.data.locales[lang].categories.post_measure }}
                        {% else %}
                          {{ site.data.locales[lang].categories.post_measure.singular | default: site.data.locales[lang].categories.post_measure }}
                        {% endif %}
                      </span>
                    </li>
                  {% endfor %}
                </ul>
              </div>
            {% endif %}
          </div>

          {% assign group_index = group_index | plus: 1 %}
        {% endif %}
      
      {% endunless %} {% endfor %}
  </div>

  <h1 class="dynamic-title ps-lg-2 mb-4 mt-5">Recent Projects</h1>

  {% assign project_posts = "" | split: "" %}
  
  {% for post in site.posts %}
    {% unless post.categories contains 'Photography' %}
      {% assign project_posts = project_posts | push: post %}
    {% endunless %}
  {% endfor %}

  {% for post in project_posts limit:10 %}
  <article class="card-wrapper card">
    <a href="{{ post.url | relative_url }}" class="post-preview row g-0 flex-md-row-reverse">
      {% assign card_body_col = '12' %}

      {% if post.image %}
        {% assign src = post.image.path | default: post.image %}
        {% assign alt = post.image.alt | xml_escape | default: 'Preview Image' %}
        <div class="col-md-5">
          <img src="{{ src | relative_url }}" alt="{{ alt }}">
        </div>
        {% assign card_body_col = '7' %}
      {% endif %}

      <div class="col-md-{{ card_body_col }}">
        <div class="card-body d-flex flex-column">
          <h1 class="card-title my-2 mt-md-0">{{ post.title }}</h1>
          <div class="card-text content mt-0 mb-3">
            <p>
              {{ post.content | markdownify | strip_html | truncate: 200 | escape }}
            </p>
          </div>
          <div class="post-meta flex-grow-1 d-flex align-items-end">
            <div class="me-auto">
              <i class="far fa-calendar fa-fw me-1"></i>
              {% include datetime.html date=post.date lang=lang %}
              {% if post.categories.size > 0 %}
                <i class="far fa-folder-open fa-fw me-1 ms-3"></i>
                <span class="categories">
                  {% for category in post.categories %}
                    {{ category }}
                    {%- unless forloop.last -%},{%- endunless -%}
                  {% endfor %}
                </span>
              {% endif %}
            </div>
            {% if post.pin %}
              <div class="pin ms-1">
                <i class="fas fa-thumbtack fa-fw"></i>
                <span>{{ site.data.locales[lang].post.pin_prompt }}</span>
              </div>
            {% endif %}
          </div>
        </div>
      </div>
    </a>
  </article>
  {% endfor %}

</div>