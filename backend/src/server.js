import "dotenv/config";
import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";

const app = express();
const port = Number(process.env.PORT || 8080);
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "billing_app",
  ssl: process.env.DB_SSL_CA
    ? { ca: process.env.DB_SSL_CA, rejectUnauthorized: true }
    : process.env.DB_SSL === "true" ? {} : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

const corsOrigins = String(process.env.CORS_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || corsOrigins.length === 0 || corsOrigins.includes(origin)),
}));
app.use(express.json({ limit: "4mb" }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const productFields = `
  id, name, sku, hsn, description,
  purchase_price AS purchasePrice, selling_price AS sellingPrice,
  gst_rate AS gstRate, active`;
const customerFields = `
  id, name, email, phone, company_name AS companyName, gstin, address, state`;
const companyColumns = [
  ["companyName", "company_name"], ["gstin", "gstin"], ["pan", "pan"], ["email", "email"],
  ["phone", "phone"], ["website", "website"], ["address", "address"], ["city", "city"],
  ["state", "state"], ["postalCode", "postal_code"], ["bankName", "bank_name"],
  ["accountHolderName", "account_holder_name"], ["accountNumber", "account_number"],
  ["accountType", "account_type"], ["ifscCode", "ifsc_code"], ["bankBranch", "bank_branch"],
];
const requiredText = (value) => typeof value === "string" && value.trim().length > 0;
const optionalMatch = (value, pattern) => !String(value ?? "").trim() || pattern.test(String(value).trim());
const validEmail = (value) => optionalMatch(value, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
const validPhone = (value) => optionalMatch(String(value ?? "").replace(/[\s()-]/g, ""), /^\+?[1-9]\d{7,14}$/);
const validGstin = (value) => optionalMatch(value, /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i);
const validPan = (value) => optionalMatch(value, /^[A-Z]{5}\d{4}[A-Z]$/i);
const validIfsc = (value) => optionalMatch(value, /^[A-Z]{4}0[A-Z0-9]{6}$/i);
const validAccountNumber = (value) => optionalMatch(value, /^\d{9,18}$/);
const validPostalCode = (value) => optionalMatch(value, /^\d{6}$/);
const validWebsite = (value) => {
  if (!String(value ?? "").trim()) return true;
  try {
    const url = new URL(String(value).trim());
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch { return false; }
};
const validateCustomer = ({ name, email, phone, gstin, state }) => {
  if (!requiredText(name)) return "Customer name is required";
  if (!requiredText(state)) return "Customer state is required for GST calculation";
  if (!validEmail(email)) return "Enter a valid customer email address";
  if (!validPhone(phone)) return "Enter a valid customer phone number (8–15 digits)";
  if (!validGstin(gstin)) return "GSTIN must be 15 characters in a valid format";
  return "";
};
const positiveId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const normalizeState = (value) => String(value || "").normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();
const parseSnapshot = (value) => typeof value === "string" ? JSON.parse(value) : value;
const ensureInvoiceAssetsTable = () => pool.query(`CREATE TABLE IF NOT EXISTS invoice_assets (
  invoice_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  digital_seal MEDIUMTEXT NOT NULL,
  digital_signature MEDIUMTEXT NOT NULL,
  CONSTRAINT fk_invoice_assets_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
)`);

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
}));

app.get("/api/company", asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`SELECT ${companyColumns.map(([key, column]) => `${column} AS ${key}`).join(", ")} FROM company_details WHERE id = 1`);
  res.json(rows[0] || null);
}));

app.put("/api/company", asyncRoute(async (req, res) => {
  const values = companyColumns.map(([key]) => String(req.body[key] ?? "").trim());
  const details = Object.fromEntries(companyColumns.map(([key], index) => [key, values[index]]));
  if (values.some(Boolean)) {
    if (!requiredText(details.companyName)) return res.status(400).json({ error: "Company name is required" });
    if (!requiredText(details.state)) return res.status(400).json({ error: "Company state is required for GST calculation" });
    if (!validEmail(details.email)) return res.status(400).json({ error: "Enter a valid company email address" });
    if (!validPhone(details.phone)) return res.status(400).json({ error: "Enter a valid company phone number (8–15 digits)" });
    if (!validWebsite(details.website)) return res.status(400).json({ error: "Enter a valid website URL starting with http:// or https://" });
    if (!validGstin(details.gstin)) return res.status(400).json({ error: "GSTIN must be 15 characters in a valid format" });
    if (!validPan(details.pan)) return res.status(400).json({ error: "PAN must contain 5 letters, 4 digits, and 1 letter" });
    if (!validPostalCode(details.postalCode)) return res.status(400).json({ error: "PIN code must contain 6 digits" });
    if (!validAccountNumber(details.accountNumber)) return res.status(400).json({ error: "Account number must contain 9–18 digits" });
    if (!validIfsc(details.ifscCode)) return res.status(400).json({ error: "IFSC must be 11 characters in a valid format" });
  }
  const columns = companyColumns.map(([, column]) => column);
  const updates = columns.map((column) => `${column} = VALUES(${column})`).join(", ");
  await pool.execute(
    `INSERT INTO company_details (id, ${columns.join(", ")}) VALUES (1, ${columns.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${updates}`,
    values,
  );
  res.json(Object.fromEntries(companyColumns.map(([key], index) => [key, values[index]])));
}));

app.get("/api/products", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT ${productFields} FROM products ORDER BY id DESC`);
  res.json(rows);
}));

app.get("/api/products/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid product ID" });
  const [rows] = await pool.execute(`SELECT ${productFields} FROM products WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Product not found" });
  res.json(rows[0]);
}));

app.post("/api/products", asyncRoute(async (req, res) => {
  const { name, sku, hsn, description = "", purchasePrice = 0, sellingPrice = 0, gstRate = 0 } = req.body;
  if (!requiredText(name) || !requiredText(sku) || !requiredText(hsn)) return res.status(400).json({ error: "Name, SKU, and HSN are required" });
  const [result] = await pool.execute(
    "INSERT INTO products (name, sku, hsn, description, purchase_price, selling_price, gst_rate) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name.trim(), sku.trim(), hsn.trim(), description, purchasePrice, sellingPrice, gstRate],
  );
  const [rows] = await pool.execute(`SELECT ${productFields} FROM products WHERE id = ?`, [result.insertId]);
  res.status(201).json(rows[0]);
}));

app.put("/api/products/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid product ID" });
  const { name, sku, hsn, description = "", purchasePrice = 0, sellingPrice = 0, gstRate = 0 } = req.body;
  if (!requiredText(name) || !requiredText(sku) || !requiredText(hsn)) return res.status(400).json({ error: "Name, SKU, and HSN are required" });
  const [result] = await pool.execute(
    "UPDATE products SET name = ?, sku = ?, hsn = ?, description = ?, purchase_price = ?, selling_price = ?, gst_rate = ? WHERE id = ?",
    [name.trim(), sku.trim(), hsn.trim(), description, purchasePrice, sellingPrice, gstRate, req.params.id],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Product not found" });
  const [rows] = await pool.execute(`SELECT ${productFields} FROM products WHERE id = ?`, [req.params.id]);
  res.json(rows[0]);
}));

app.delete("/api/products/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid product ID" });
  const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
}));

app.get("/api/customers", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT ${customerFields} FROM customers ORDER BY id DESC`);
  res.json(rows);
}));

app.post("/api/customers", asyncRoute(async (req, res) => {
  const { name, email = "", phone = "", companyName = "", gstin = "", address = "", state = "" } = req.body;
  const validationError = validateCustomer({ name, email, phone, gstin, state });
  if (validationError) return res.status(400).json({ error: validationError });
  const [result] = await pool.execute(
    "INSERT INTO customers (name, email, phone, company_name, gstin, address, state) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name.trim(), email, phone, companyName, gstin, address, state],
  );
  const [rows] = await pool.execute(`SELECT ${customerFields} FROM customers WHERE id = ?`, [result.insertId]);
  res.status(201).json(rows[0]);
}));

app.put("/api/customers/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid customer ID" });
  const { name, email = "", phone = "", companyName = "", gstin = "", address = "", state = "" } = req.body;
  const validationError = validateCustomer({ name, email, phone, gstin, state });
  if (validationError) return res.status(400).json({ error: validationError });
  const [result] = await pool.execute(
    "UPDATE customers SET name = ?, email = ?, phone = ?, company_name = ?, gstin = ?, address = ?, state = ? WHERE id = ?",
    [name.trim(), email, phone, companyName, gstin, address, state, req.params.id],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Customer not found" });
  res.json({ id: Number(req.params.id), name: name.trim(), email, phone, companyName, gstin, address, state });
}));

app.delete("/api/customers/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid customer ID" });
  const [result] = await pool.execute("DELETE FROM customers WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: "Customer not found" });
  res.status(204).end();
}));

app.get("/api/invoices", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT i.id, i.invoice_number AS invoiceNumber,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.customer_snapshot, '$.name')), c.name) AS customerName,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.customer_snapshot, '$.companyName')), c.company_name) AS customerCompanyName,
      DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoiceDate,
      DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate,
      ROUND(i.total_amount) AS totalAmount, i.status
    FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
    ORDER BY i.id DESC`);
  res.json(rows);
}));

app.get("/api/invoices/:id", asyncRoute(async (req, res) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ error: "Invalid invoice ID" });
  const [invoices] = await pool.execute(`
    SELECT i.id, i.invoice_number AS invoiceNumber, i.customer_id AS customerId,
      DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoiceDate,
      DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate, i.notes,
      i.subtotal, i.discount_amount AS discountAmount, i.discount_type AS discountType, i.discount_value AS discountValue,
      i.tax_amount AS taxAmount, ROUND(i.total_amount) AS totalAmount, i.status,
      i.tax_type AS taxType, i.seller_snapshot AS sellerSnapshot,
      i.customer_snapshot AS customerSnapshot
    FROM invoices i WHERE i.id = ?`, [req.params.id]);
  if (!invoices.length) return res.status(404).json({ error: "Invoice not found" });
  const invoice = invoices[0];
  let sellerSnapshot;
  let customerSnapshot;
  try {
    sellerSnapshot = parseSnapshot(invoice.sellerSnapshot);
    customerSnapshot = parseSnapshot(invoice.customerSnapshot);
  } catch {
    sellerSnapshot = null;
    customerSnapshot = null;
  }
  let taxType = invoice.taxType;
  if (taxType === "unknown") {
    if (!sellerSnapshot) {
      const [companies] = await pool.execute(`SELECT ${companyColumns.map(([key, column]) => `${column} AS ${key}`).join(", ")} FROM company_details WHERE id = 1`);
      sellerSnapshot = companies[0] || null;
    }
    if (!customerSnapshot?.state) {
      const [customers] = await pool.execute(`SELECT name, email, phone, company_name AS companyName, gstin, address, state FROM customers WHERE id = ?`, [invoice.customerId]);
      customerSnapshot = customers[0] || customerSnapshot;
    }
    if (sellerSnapshot?.companyName && normalizeState(sellerSnapshot.state) && normalizeState(customerSnapshot?.state)) {
      taxType = normalizeState(sellerSnapshot.state) === normalizeState(customerSnapshot.state) ? "intra" : "inter";
      await pool.execute("UPDATE invoices SET tax_type = ?, seller_snapshot = ?, customer_snapshot = ? WHERE id = ? AND tax_type = 'unknown'", [taxType, JSON.stringify(sellerSnapshot), JSON.stringify(customerSnapshot), req.params.id]);
      await pool.execute(`UPDATE invoice_items SET
        cgst_amount = IF(? = 'intra', ROUND(line_tax / 2, 2), 0),
        sgst_amount = IF(? = 'intra', line_tax - ROUND(line_tax / 2, 2), 0),
        igst_amount = IF(? = 'inter', line_tax, 0)
        WHERE invoice_id = ?`, [taxType, taxType, taxType, req.params.id]);
    }
  }
  const [items] = await pool.execute(`
    SELECT ii.id, ii.product_id AS productId, ii.product_name AS productName,
      ii.sku, ii.hsn, ii.description, ii.quantity, ii.unit_price AS unitPrice,
      ii.gst_rate AS gstRate, ii.line_subtotal AS lineSubtotal, ii.line_tax AS lineTax,
      ii.cgst_amount AS cgstAmount, ii.sgst_amount AS sgstAmount, ii.igst_amount AS igstAmount
    FROM invoice_items ii WHERE ii.invoice_id = ? ORDER BY ii.id`, [req.params.id]);
  await ensureInvoiceAssetsTable();
  const [[assets]] = await pool.execute("SELECT digital_seal AS digitalSeal, digital_signature AS digitalSignature FROM invoice_assets WHERE invoice_id = ?", [req.params.id]);
  res.json({
    ...invoice,
    taxType,
    sellerSnapshot,
    customerSnapshot,
    includeDigitalSeal: sellerSnapshot?.includeDigitalSeal !== false,
    includeDigitalSignature: sellerSnapshot?.includeDigitalSignature ?? sellerSnapshot?.includeDigitalSeal !== false,
    digitalSeal: sellerSnapshot?.includeDigitalSeal === false ? "" : assets?.digitalSeal || sellerSnapshot?.digitalSeal || "",
    digitalSignature: (sellerSnapshot?.includeDigitalSignature ?? sellerSnapshot?.includeDigitalSeal !== false)
      ? assets?.digitalSignature || sellerSnapshot?.digitalSignature || ""
      : "",
    items,
  });
}));

app.post("/api/invoices", asyncRoute(async (req, res) => {
  const { customerId, invoiceDate, dueDate = null, notes = "", items } = req.body;
  const discountType = req.body.discountType === "percent" ? "percent" : "amount";
  const discountValue = Number(req.body.discountValue ?? req.body.discountAmount ?? 0);
  const includeDigitalSeal = req.body.includeDigitalSeal !== false;
  const includeDigitalSignature = req.body.includeDigitalSignature === true;
  const digitalSeal = includeDigitalSeal && typeof req.body.digitalSeal === "string" ? req.body.digitalSeal : "";
  const digitalSignature = includeDigitalSignature && typeof req.body.digitalSignature === "string" ? req.body.digitalSignature : "";
  const validImageData = (value) => !value || (value.length <= 1_500_000 && /^data:image\/(png|jpeg|webp);base64,[a-z\d+/]+=*$/i.test(value));
  if (!validImageData(digitalSeal) || !validImageData(digitalSignature)) {
    return res.status(400).json({ error: "Seal and signature must be PNG, JPG, or WebP images no larger than 1 MB each" });
  }
  if (!positiveId(customerId) || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate || "") || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Customer, invoice date, and at least one item are required" });
  }
  if (!Number.isFinite(discountValue) || discountValue < 0 || (discountType === "percent" && discountValue > 100)) return res.status(400).json({ error: discountType === "percent" ? "Discount percentage must be between 0 and 100" : "Discount must be a non-negative amount" });
  if (new Set(items.map((item) => Number(item.productId))).size !== items.length) return res.status(400).json({ error: "A product can only appear once on an invoice; update its quantity instead" });
  if (digitalSeal || digitalSignature) await ensureInvoiceAssetsTable();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[customer]] = await connection.execute(`SELECT id, name, email, phone, company_name AS companyName,
      gstin, address, state FROM customers WHERE id = ?`, [customerId]);
    if (!customer) {
      await connection.rollback();
      return res.status(400).json({ error: "Customer not found" });
    }
    const [[company]] = await connection.execute(`SELECT ${companyColumns.map(([key, column]) => `${column} AS ${key}`).join(", ")} FROM company_details WHERE id = 1`);
    if (!company || !requiredText(company.companyName) || !normalizeState(company.state) || !normalizeState(customer.state)) {
      throw Object.assign(new Error("Set both the seller state in Company Details and the customer's state before creating an invoice"), { status: 400 });
    }
    const taxType = normalizeState(company.state) === normalizeState(customer.state) ? "intra" : "inter";
    const sellerSnapshot = { ...company, includeDigitalSeal, includeDigitalSignature };
    const customerSnapshot = customer;
    const invoiceLines = [];
    for (const item of items) {
      if (!positiveId(item.productId) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) throw Object.assign(new Error("Invalid invoice item"), { status: 400 });
      const [[product]] = await connection.execute("SELECT id, name, sku, hsn, description, selling_price, gst_rate FROM products WHERE id = ? AND active = TRUE", [item.productId]);
      if (!product) throw Object.assign(new Error(`Product ${item.productId} not found or inactive`), { status: 400 });
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.selling_price);
      const gstRate = Number(product.gst_rate);
      const lineSubtotal = Number((quantity * unitPrice).toFixed(2));
      const lineTax = Number((lineSubtotal * gstRate / 100).toFixed(2));
      const cgstAmount = taxType === "intra" ? Number((lineTax / 2).toFixed(2)) : 0;
      const sgstAmount = taxType === "intra" ? Number((lineTax - cgstAmount).toFixed(2)) : 0;
      const igstAmount = taxType === "inter" ? lineTax : 0;
      invoiceLines.push({ ...product, quantity, unitPrice, gstRate, lineSubtotal, lineTax, cgstAmount, sgstAmount, igstAmount });
    }
    const subtotalPaise = invoiceLines.reduce((sum, line) => sum + Math.round(line.lineSubtotal * 100), 0);
    const taxPaise = invoiceLines.reduce((sum, line) => sum + Math.round(line.lineTax * 100), 0);
    const subtotal = subtotalPaise / 100;
    const taxAmount = taxPaise / 100;
    const discountPaise = discountType === "percent"
      ? Math.round((subtotalPaise + taxPaise) * discountValue / 100)
      : Math.round(discountValue * 100);
    if (discountPaise > subtotalPaise + taxPaise) throw Object.assign(new Error("Discount cannot exceed the invoice amount"), { status: 400 });
    const total = Math.floor((subtotalPaise + taxPaise - discountPaise + 50) / 100);
    const [result] = await connection.execute(
      "INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, notes, subtotal, discount_amount, discount_type, discount_value, tax_amount, total_amount, tax_type, seller_snapshot, customer_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [`TMP-${randomUUID()}`, customerId, invoiceDate, dueDate || null, notes, subtotal, discountPaise / 100, discountType, discountValue, taxAmount, total, taxType, JSON.stringify(sellerSnapshot), JSON.stringify(customerSnapshot)],
    );
    const invoiceNumber = `INV-${invoiceDate.slice(0, 4)}-${String(result.insertId).padStart(6, "0")}`;
    await connection.execute("UPDATE invoices SET invoice_number = ? WHERE id = ?", [invoiceNumber, result.insertId]);
    for (const line of invoiceLines) {
      await connection.execute(
        "INSERT INTO invoice_items (invoice_id, product_id, product_name, sku, hsn, description, quantity, unit_price, gst_rate, line_subtotal, line_tax, cgst_amount, sgst_amount, igst_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [result.insertId, line.id, line.name, line.sku, line.hsn, line.description || "", line.quantity, line.unitPrice, line.gstRate, line.lineSubtotal, line.lineTax, line.cgstAmount, line.sgstAmount, line.igstAmount],
      );
    }
    if (digitalSeal || digitalSignature) {
      await connection.execute(
        "INSERT INTO invoice_assets (invoice_id, digital_seal, digital_signature) VALUES (?, ?, ?)",
        [result.insertId, digitalSeal, digitalSignature],
      );
    }
    await connection.commit();
    res.status(201).json({ id: result.insertId, invoiceNumber, customerName: "", invoiceDate, dueDate, totalAmount: total, status: "Draft" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A record with that unique value already exists" });
  if (error.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ error: "This customer is linked to an invoice and cannot be deleted" });
  res.status(error.status || 500).json({ error: error.status ? error.message : "Internal server error" });
});

const server = app.listen(port, "0.0.0.0", () => console.log(`Billing API listening on port ${port}`));
const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
