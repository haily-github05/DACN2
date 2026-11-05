CREATE TABLE IF NOT EXISTS community_comments (
  comment_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_post (post_id, comment_id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id BIGINT NOT NULL,
  followed_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followed_id),
  INDEX idx_follows_author (followed_id)
);
