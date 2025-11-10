
CREATE TABLE IF NOT EXISTS motifications (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    reciever VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON motifications(reciever);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON motifications(sender);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON motifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON motifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON motifications(reciever, is_read) WHERE is_read = false;

CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    CHECK(user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

SELECT * FROM users WHERE clerk_user_id = $1;

SELECT * FROM users;

INSERT INTO users (clerk_user_id, username, email) VALUES ($1, $2, $3);

DELETE FROM users;

SELECT * FROM friends 
WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1);

SELECT u.id, u.clerk_user_id, u.username, u.email, f.created_at
FROM friends f
JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
WHERE u.id != $1
ORDER BY f.created_at DESC;

INSERT INTO friends (user_id, friend_id) VALUES ($1, $2);

DELETE FROM friends 
WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1);

SELECT * FROM motifications 
WHERE reciever = $1 
ORDER BY created_at DESC;

INSERT INTO motifications (sender, reciever, type) 
VALUES ($1, $2, $3) 
RETURNING *;

DELETE FROM motifications 
WHERE sender = $1 AND reciever = $2 AND type = 'send_req';

UPDATE motifications 
SET is_read = true 
WHERE id = $1 AND reciever = $2 
RETURNING *;

DELETE FROM motifications 
WHERE id = $1 AND reciever = $2 
RETURNING *;

SELECT COUNT(*) FROM motifications 
WHERE reciever = $1 AND type = 'send_req';

SELECT * FROM motifications 
WHERE sender = $1 AND reciever = $2 AND type = 'send_req';

SELECT * FROM music 
WHERE clerk_user_id = $1 AND isfav = true;

SELECT * FROM music 
WHERE musicid = $1 AND clerk_user_id = $2;

UPDATE music 
SET isfav = $1 
WHERE musicid = $2 AND clerk_user_id = $3;

INSERT INTO music (musicid, clerk_user_id, isfav) 
VALUES ($1, $2, $3) 
RETURNING *;

-- INSERT INTO video (video, roomId, userId)
-- VALUES ($1, $2, $3)
-- RETURNING *;

