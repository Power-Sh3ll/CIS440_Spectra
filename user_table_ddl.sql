CREATE TABLE user (
    email VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE user_settings (
    user_email VARCHAR(255) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    allow_pokes BOOLEAN DEFAULT true,
    activity_privacy VARCHAR(20) DEFAULT 'public',
    units VARCHAR(20) DEFAULT 'metric',
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    weekly_goal_steps INT DEFAULT 70000,
    weekly_goal_distance DECIMAL(8,2) DEFAULT 50.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
);