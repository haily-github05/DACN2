ALTER TABLE community_comments
  ADD COLUMN parent_comment_id BIGINT NULL,
  ADD INDEX idx_comment_thread (post_id, parent_comment_id, comment_id),
  ADD CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id)
    REFERENCES community_comments(comment_id) ON DELETE CASCADE;
