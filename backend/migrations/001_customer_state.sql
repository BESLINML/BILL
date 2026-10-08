USE billing_app;

ALTER TABLE customers
  ADD COLUMN state VARCHAR(100) NOT NULL DEFAULT '' AFTER address;
