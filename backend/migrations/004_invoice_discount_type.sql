USE billing_app;

ALTER TABLE invoices
  ADD COLUMN discount_type VARCHAR(10) NOT NULL DEFAULT 'amount' AFTER discount_amount,
  ADD COLUMN discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER discount_type;

UPDATE invoices SET discount_value = discount_amount WHERE discount_type = 'amount';
