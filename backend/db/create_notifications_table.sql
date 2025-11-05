-- Create notifications table (motifications - note the typo in existing code)
-- This table stores notifications between users

CREATE TABLE IF NOT EXISTS motifications (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,  -- Clerk user ID of the sender
    reciever VARCHAR(255) NOT NULL,  -- Clerk user ID of the receiver (note: typo in column name)
    type VARCHAR(50) NOT NULL,      -- Type: 'send_req', 'accept', 'reject', etc.
    is_read BOOLEAN DEFAULT false,   -- Whether the notification has been read
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON motifications(reciever);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON motifications(sender);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON motifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON motifications(created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON motifications(reciever, is_read) WHERE is_read = false;

