-- 007_token_blacklist.sql
-- Create table for blacklisted JWT IDs (jti)

CREATE TABLE token_blacklist (
    jti TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient cleanup of expired tokens
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
