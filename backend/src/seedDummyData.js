import "dotenv/config";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "billing_app",
  waitForConnections: true,
  connectionLimit: 2,
  decimalNumbers: true,
});

const productGroups = [
  { category: "Notebook", hsn: "482010", base: 45, gst: 12 },
  { category: "Ball Pen", hsn: "960810", base: 8, gst: 18 },
  { category: "Marker", hsn: "960820", base: 22, gst: 18 },
  { category: "Desk Organizer", hsn: "392610", base: 120, gst: 18 },
  { category: "Water Bottle", hsn: "392330", base: 180, gst: 18 },
  { category: "USB Cable", hsn: "854442", base: 95, gst: 18 },
  { category: "Wireless Mouse", hsn: "847160", base: 350, gst: 18 },
  { category: "Keyboard", hsn: "847160", base: 650, gst: 18 },
  { category: "LED Lamp", hsn: "940520", base: 420, gst: 12 },
  { category: "Cotton Tote Bag", hsn: "420292", base: 90, gst: 12 },
];

const firstNames = ["Aarav", "Aditi", "Arjun", "Diya", "Ishaan", "Kavya", "Kabir", "Meera", "Neha", "Rohan", "Sana", "Vihaan", "Ananya", "Dev", "Ira", "Karan", "Mira", "Nikhil", "Pooja", "Rahul", "Sara", "Varun", "Zoya", "Aditya", "Tara"];
const lastNames = ["Sharma", "Patel", "Rao", "Mehta", "Nair", "Singh", "Iyer", "Kapoor", "Das", "Joshi", "Khan", "Verma", "Gupta", "Reddy", "Menon", "Bose", "Malhotra", "Kulkarni", "Sethi", "Pillai", "Chopra", "Mishra", "Desai", "Bhat", "Banerjee"];
const states = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Telangana", "West Bengal", "Rajasthan", "Kerala", "Uttar Pradesh", "Punjab", "Haryana", "Madhya Pradesh", "Odisha", "Assam", "Bihar", "Goa", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh", "Andhra Pradesh", "Sikkim", "Tripura", "Meghalaya"];

const products = Array.from({ length: 100 }, (_, index) => {
  const group = productGroups[index % productGroups.length];
  const sequence = String(index + 1).padStart(3, "0");
  const purchasePrice = Number((group.base * (0.62 + (index % 8) * 0.025)).toFixed(2));
  return [
    `${group.category} ${sequence}`,
    `DUMMY-SKU-${sequence}`,
    group.hsn,
    `Sample ${group.category.toLowerCase()} for demo and testing (dummy item ${sequence}).`,
    purchasePrice,
    Number((purchasePrice * (1.25 + (index % 5) * 0.05)).toFixed(2)),
    group.gst,
  ];
});

const customers = Array.from({ length: 25 }, (_, index) => {
  const sequence = String(index + 1).padStart(3, "0");
  const name = `${firstNames[index]} ${lastNames[index]}`;
  return [
    name,
    `dummy.customer${sequence}@example.test`,
    `+91987654${String(index).padStart(4, "0")}`,
    `${name} Trading`,
    `${String(index + 1).padStart(2, "0")}ABCDE${String(1000 + index)}F1Z5`,
    `Demo address ${index + 1}, Sample Market`,
    states[index],
  ];
});

try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const row of products) {
      await connection.execute(
        `INSERT INTO products (name, sku, hsn, description, purchase_price, selling_price, gst_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE sku = VALUES(sku)`,
        row,
      );
    }
    for (const row of customers) {
      await connection.execute(
        `INSERT INTO customers (name, email, phone, company_name, gstin, address, state)
         SELECT ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS
         (SELECT 1 FROM customers WHERE email = ? LIMIT 1)`,
        [...row, row[1]],
      );
    }
    await connection.commit();
    console.log("Seeded 100 dummy products and 25 dummy customers (safe to run again).");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
} finally {
  await pool.end();
}
