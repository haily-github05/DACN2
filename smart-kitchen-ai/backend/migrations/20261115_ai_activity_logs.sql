CREATE TABLE IF NOT EXISTS ai_activity_logs (
  ai_activity_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  activity_type ENUM('INGREDIENT_SCAN','RECIPE_SUGGESTION','MEAL_PLAN','CHAT') NOT NULL,
  status ENUM('SUCCESS','FAILURE') NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  duration_ms INT UNSIGNED NULL,
  error_code VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_activity_created (created_at, activity_type, status),
  INDEX idx_ai_activity_type_created (activity_type, created_at),
  INDEX idx_ai_activity_user_created (user_id, created_at)
);
