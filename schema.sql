
-- Users Table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    platform_handle TEXT UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'simple', -- simple, premium
    role TEXT DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, suspended, inactive, rejected
    subscription_end TEXT,
    payment_status TEXT,
    total_sessions INTEGER DEFAULT 0,
    last_login TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Applications Table
DROP TABLE IF EXISTS applications;
CREATE TABLE applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    requested_handle TEXT,
    motivation TEXT,
    experience TEXT,
    requested_tier TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Accepted, Rejected
    notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Protocol Affirmations
DROP TABLE IF EXISTS protocol_affirmations;
CREATE TABLE protocol_affirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    btc_only BOOLEAN DEFAULT 0,
    london_ny_only BOOLEAN DEFAULT 0,
    r_multiple_only BOOLEAN DEFAULT 0,
    no_signal_expectation BOOLEAN DEFAULT 0,
    discipline_over_profit BOOLEAN DEFAULT 0,
    personal_risk_acceptance BOOLEAN DEFAULT 0,
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin & Audit Tables
DROP TABLE IF EXISTS user_upgrades;
CREATE TABLE user_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    old_tier TEXT, 
    new_tier TEXT, 
    upgraded_by TEXT, 
    upgraded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS user_downgrades;
CREATE TABLE user_downgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    old_tier TEXT, 
    new_tier TEXT, 
    downgraded_by TEXT, 
    downgraded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS user_suspensions;
CREATE TABLE user_suspensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    reason TEXT, 
    suspended_by TEXT, 
    suspended_at TEXT DEFAULT CURRENT_TIMESTAMP, 
    lifted_at TEXT
);

DROP TABLE IF EXISTS admin_emails;
CREATE TABLE admin_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    subject TEXT, 
    message TEXT, 
    sent_by TEXT, 
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    last_activity TEXT
);

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id TEXT, 
    amount REAL, 
    status TEXT, 
    created_at TEXT
);

-- Cleanup old tables if they exist
DROP TABLE IF EXISTS affirmations;
DROP TABLE IF EXISTS user_history;

-- Indices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_user ON applications(user_id);
