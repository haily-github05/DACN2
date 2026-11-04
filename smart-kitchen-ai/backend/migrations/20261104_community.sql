CREATE TABLE IF NOT EXISTS community_posts (
  post_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  image_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id)
);
CREATE TABLE IF NOT EXISTS community_reactions (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  kind VARCHAR(10) NOT NULL,
  PRIMARY KEY (user_id, post_id, kind),
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS recipe_favorites (
  user_id BIGINT NOT NULL,
  recipe_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);
