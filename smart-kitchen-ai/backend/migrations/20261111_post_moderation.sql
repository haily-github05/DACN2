ALTER TABLE community_posts
  ADD COLUMN moderation_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN rejection_reason VARCHAR(1000) NULL,
  ADD COLUMN reviewed_by BIGINT NULL,
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD INDEX idx_post_moderation (visibility,moderation_status,post_id);
ALTER TABLE community_posts ALTER COLUMN moderation_status SET DEFAULT 'PENDING';
CREATE TABLE IF NOT EXISTS admin_post_reads (
  admin_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id,post_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE
);
