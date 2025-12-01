-- User Settings table for CIS440_Spectra project
-- Stores user preferences and settings

CREATE TABLE user_settings (
  user_email VARCHAR(255) PRIMARY KEY,
  theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  activity_privacy ENUM('public', 'friends', 'private') DEFAULT 'public',
  units ENUM('metric', 'imperial') DEFAULT 'metric',
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  weekly_goal_steps INT DEFAULT 70000,
  weekly_goal_distance DECIMAL(8,2) DEFAULT 50.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;