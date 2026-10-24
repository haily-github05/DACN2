-- Run once in the MySQL database configured in backend/.env.
-- Existing accounts retain their email; phone-only accounts may omit it.
ALTER TABLE users
  MODIFY email VARCHAR(255) NULL,
  ADD COLUMN phone VARCHAR(20) NULL AFTER full_name,
  ADD UNIQUE KEY uq_users_phone (phone);
