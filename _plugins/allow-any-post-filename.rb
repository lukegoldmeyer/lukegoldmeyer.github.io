#!/usr/bin/env ruby
#
# Allow any filename format in _posts directory
# This plugin overrides Jekyll's default post filename requirement
# which normally requires YYYY-MM-DD-title.md format
#
# Now any .md file in _posts will be recognized as a post,
# and the date will be taken from the front matter 'date' field

module Jekyll
  # Override PostReader to use our custom pattern and handle subdirectories
  class PostReader
    alias_method :original_read_posts, :read_posts
    
    def read_posts(dir)
      # Use read_publishable with our custom pattern to read from root _posts
      # This uses Jekyll's built-in post reading which handles all the setup
      posts = read_publishable(dir, "_posts", /.*\.(md|markdown)$/i) || []
      
      # Now add posts from subdirectories
      posts_dir = File.join(dir, "_posts")
      return posts unless File.directory?(posts_dir)
      
      # Read all .md files from subdirectories only
      Dir.glob(File.join(posts_dir, "*", "*.{md,markdown}")).each do |file_path|
        next if File.directory?(file_path)
        
        # Get relative path from _posts directory (e.g., "photos/my-post.md")
        relative_path = file_path.sub(posts_dir + File::SEPARATOR, "").gsub("\\", "/")
        
        # Skip if already processed (in root directory)
        next if relative_path == File.basename(relative_path)
        
        # Validate the filename
        next unless Post.valid?(relative_path)
        
        begin
          # Create post object
          post = Post.new(@site, dir, "_posts", relative_path)
          
          # Read front matter
          post.read_yaml_front_matter(File.dirname(file_path))
          
          # Process the post
          post.process(relative_path)
          
          # Add to collection if valid
          if post.data && post.data['title']
            posts << post
          end
        rescue => e
          Jekyll.logger.warn "Failed to read post: #{relative_path} - #{e.message}"
        end
      end
      
      posts
    end
  end
  
  # Override Post class to accept any filename
  class Post
    # Remove the old constant and define a new one that accepts any filename
    remove_const(:DATE_FILENAME_MATCHER) if const_defined?(:DATE_FILENAME_MATCHER)
    DATE_FILENAME_MATCHER = /.*\.(md|markdown)$/i
    
    # Override the class method that validates filenames
    def self.valid?(name)
      name =~ DATE_FILENAME_MATCHER
    end
    
    # Override process to handle any filename (including subdirectory paths)
    def process(name)
      # Handle subdirectory paths (e.g., "photos/my-post.md" or "projects/my-post.md")
      # Extract just the filename for slug, but preserve the path structure
      self.slug = File.basename(name, ".*")
      self.ext = File.extname(name)
      
      # Try to extract date from filename if it matches the old format
      if name =~ /(\d{4})-(\d{2})-(\d{2})/
        self.date = Time.utc($1.to_i, $2.to_i, $3.to_i)
      end
    end
    
    # Override to set date from front matter
    def read_yaml_front_matter(dir)
      super
      
      # Always use front matter date if available, otherwise use filename date or file mtime
      if self.data && self.data['date']
        self.date = Utils.parse_date(self.data['date'], "Post date in #{self.path}")
      elsif !self.date || self.date.to_s.empty?
        self.date = File.mtime(self.path) if File.exist?(self.path)
      end
    end
  end
  
  # Hook to ensure dates are set correctly after post initialization
  Jekyll::Hooks.register :posts, :post_init do |post|
    if post.data && post.data['date']
      post.date = Utils.parse_date(post.data['date'], "Post date in #{post.path}")
    end
  end
end
