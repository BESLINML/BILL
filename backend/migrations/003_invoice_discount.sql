USE billing_app;

ALTER TABLE invoices
  ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER subtotal;
