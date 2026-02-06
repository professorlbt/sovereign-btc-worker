
-- Insert a test user
INSERT INTO users (id, email, password_hash, first_name, last_name, platform_handle, account_type, status, created_at, updated_at) 
VALUES (
    'user-123', 
    'trader@example.com', 
    '$2a$10$X7V.j.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7Z.Z7', 
    'Satoshi', 
    'Nakamoto', 
    'SatoshiNaka', 
    'simple', 
    'active', 
    '2023-01-01T00:00:00.000Z', 
    '2023-01-01T00:00:00.000Z'
);

INSERT INTO applications (id, user_id, requested_handle, motivation, experience, status, created_at)
VALUES (
    'app-123', 
    'user-123', 
    'SatoshiNaka', 
    'I want to learn sovereign trading.', 
    '3 years crypto', 
    'Accepted', 
    '2023-01-01T00:00:00.000Z'
);

INSERT INTO protocol_affirmations (user_id, btc_only, london_ny_only, r_multiple_only, no_signal_expectation, discipline_over_profit, personal_risk_acceptance, created_at)
VALUES (
    'user-123', 
    1, 1, 1, 1, 1, 1, 
    '2023-01-01T00:00:00.000Z'
);
