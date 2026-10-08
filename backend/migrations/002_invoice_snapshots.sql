USE billing_app;

ALTER TABLE invoices
  ADD COLUMN tax_type VARCHAR(8) NOT NULL DEFAULT 'unknown',
  ADD COLUMN seller_snapshot JSON NULL,
  ADD COLUMN customer_snapshot JSON NULL;

ALTER TABLE invoice_items
  ADD COLUMN sku VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN hsn VARCHAR(40) NOT NULL DEFAULT '',
  ADD COLUMN description TEXT NULL,
  ADD COLUMN cgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN sgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN igst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE invoice_items ii
JOIN products p ON p.id = ii.product_id
SET ii.sku = p.sku, ii.hsn = p.hsn, ii.description = p.description;

UPDATE invoices i
JOIN customers c ON c.id = i.customer_id
LEFT JOIN company_details co ON co.id = 1
SET i.customer_snapshot = JSON_OBJECT(
      'name', c.name, 'email', c.email, 'phone', c.phone, 'companyName', c.company_name,
      'gstin', c.gstin, 'address', c.address, 'state', c.state
    ),
    i.seller_snapshot = IF(co.id IS NULL, NULL, JSON_OBJECT(
      'companyName', co.company_name, 'gstin', co.gstin, 'pan', co.pan, 'email', co.email,
      'phone', co.phone, 'website', co.website, 'address', co.address, 'city', co.city,
      'state', co.state, 'postalCode', co.postal_code, 'bankName', co.bank_name,
      'accountHolderName', co.account_holder_name, 'accountNumber', co.account_number,
      'accountType', co.account_type, 'ifscCode', co.ifsc_code, 'bankBranch', co.bank_branch
    )),
    i.tax_type = CASE
      WHEN co.state IS NULL OR c.state = '' THEN 'unknown'
      WHEN LOWER(REPLACE(co.state, ' ', '')) = LOWER(REPLACE(c.state, ' ', '')) THEN 'intra'
      ELSE 'inter'
    END;

ALTER TABLE invoice_items DROP FOREIGN KEY fk_invoice_items_product;

ALTER TABLE invoice_items
  MODIFY product_id BIGINT UNSIGNED NULL,
  ADD CONSTRAINT fk_invoice_items_product_snapshot
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

UPDATE invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
SET ii.cgst_amount = IF(i.tax_type = 'intra', ROUND(ii.line_tax / 2, 2), 0),
    ii.sgst_amount = IF(i.tax_type = 'intra', ii.line_tax - ROUND(ii.line_tax / 2, 2), 0),
    ii.igst_amount = IF(i.tax_type = 'inter', ii.line_tax, 0);
