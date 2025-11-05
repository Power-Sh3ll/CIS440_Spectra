-- Friendships table structure for CIS440_Spectra project
-- Supports friend requests with status tracking

-- Create friendships table with status support
CREATE TABLE friendships (
  user_email VARCHAR(255) NOT NULL COLLATE latin1_swedish_ci,
  friend_email VARCHAR(255) NOT NULL COLLATE latin1_swedish_ci,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  requested_by VARCHAR(255) NOT NULL COLLATE latin1_swedish_ci,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_email, friend_email)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add foreign key constraints
ALTER TABLE friendships 
ADD CONSTRAINT fk_user_email 
FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT fk_friend_email 
FOREIGN KEY (friend_email) REFERENCES user(email) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT fk_requested_by 
FOREIGN KEY (requested_by) REFERENCES user(email) ON DELETE CASCADE;