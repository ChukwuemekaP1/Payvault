-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(255) NOT NULL UNIQUE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
    type VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transaction lookups
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
