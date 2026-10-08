# Billing App

A React and TypeScript billing dashboard built with Vite and Material UI.

## Features

- Dashboard, products, customers, invoices, and settings sections
- Product listing with search, deletion, and active status
- Product create, view, and edit screens backed by the products API
- Responsive navigation drawer
- Company details stored in MySQL and used for billing documents
- Invoice records retain seller, customer, product, and GST snapshots

## Development

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

The frontend expects a backend API at `http://localhost:8080/api` by default. This repository includes a Node.js API backed by MySQL in `backend/`.

## MySQL database and API

1. Install MySQL 8 and create the schema from the project root:

   ```sh
   mysql -u root -p < backend/schema.sql
   ```

   If upgrading a database created before customer state was added, apply `backend/migrations/001_customer_state.sql` once:

   ```sh
   mysql -u root -p < backend/migrations/001_customer_state.sql
   ```

   Apply the invoice snapshot migration after that. It preserves invoice line details and tax breakdowns when customer or product records later change:

   ```sh
   mysql -u root -p < backend/migrations/002_invoice_snapshots.sql
   ```

   Apply the invoice discount migration as well. The API's invoice detail query and invoice creation require this column:

   ```sh
   mysql -u root -p < backend/migrations/003_invoice_discount.sql
   ```

   For percentage discounts, apply the next migration too:

   ```sh
   mysql -u root -p < backend/migrations/004_invoice_discount_type.sql
   ```

Opening Company Details syncs any previously browser-saved company profile into MySQL. Legacy invoices are completed with saved company/customer details the first time they are opened after setup; new invoices snapshot all details and tax amounts at creation.

2. Create `backend/.env` by copying `backend/.env.example`, then set the MySQL user and password for your machine. Do not commit this file.

3. Install and start the API:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

The API provides product, customer, and invoice endpoints under `/api`. The schema also includes a `company_details` table for the company billing information. To point the frontend at another API, set `VITE_API_BASE_URL` in `my-app/.env`, for example:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

## Available scripts

- `npm run dev` starts the development server.
- `npm run build` type-checks the app and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint.

## Deployment: GitHub, Vercel, Render, and Aiven

This project uses a React/Vite frontend and a Node.js/Express API. It does not use Spring Boot.

1. Push the repository to GitHub.
2. Create an Aiven for MySQL service and a database named `billing_app`. Import `backend/schema.sql` for a new database. For an existing database, apply only the migrations it is missing, in order. Copy the Aiven host, port, username, password, and project CA certificate from its connection details.
3. In Render, create the web service from the repository using the included `render.yaml` Blueprint. It uses `backend` as its root, `npm ci` to build, `npm start` to run, and `/api/health` as its health check. Set the Aiven connection values in the service environment. Paste the Aiven CA certificate contents into `DB_SSL_CA` to enable certificate-verified TLS.
4. In Vercel, import the same GitHub repository and set the project root directory to `frontend`. Set `VITE_API_BASE_URL` to `https://<render-service>.onrender.com/api`, then deploy. The build command is `npm run build`, and the output directory is `dist`. `frontend/vercel.json` enables React Router deep links.
5. Set Render's `CORS_ORIGIN` to the deployed Vercel origin, for example `https://<your-app>.vercel.app` (no trailing slash). If you use a custom domain, include that origin too. Save and redeploy the Render service.

Vite embeds `VITE_API_BASE_URL` into the frontend during the build, so set it in Vercel before deploying. Keep database credentials and CA settings in Render environment variables; never add them to Vite variables or commit them to GitHub.

**Access control:** The API currently has no authentication, so its customer, product, and invoice endpoints are publicly accessible once deployed. CORS does not protect the API from non-browser clients. Add authentication before storing real business or customer data in this public deployment.

## Source layout

```text
src/
  api/                 API clients
  components/          Dashboard and feature components
  types/               Shared TypeScript types
  App.tsx               Routes
  main.tsx              Application entry point
```
