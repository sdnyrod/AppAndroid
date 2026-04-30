# CREW Android App Architecture

## Core Principle
The app mirrors the web experience. Navigation is dynamic, driven by permissions fetched from the backend via `roles.myPermissions`.

## Database Roles (from schema)
- `employee` → Worker
- `supervisor` → Supervisor  
- `owner` → Owner/Admin (ALL permissions)
- `admin` → Admin (ALL permissions)

## Permission Resolution (Backend)
1. User logs in → gets JWT cookie
2. `roles.myPermissions` returns `{ role, permissions: string[] }`
3. Owner/Admin → ALL_PERMISSION_CODES (131 permissions)
4. Supervisor → SUPERVISOR_DEFAULT_PERMISSIONS (or custom if customRoleId set)
5. Employee → EMPLOYEE_DEFAULT_PERMISSIONS (or custom if customRoleId set)

## App Architecture
- Single drawer navigation (not role-based tabs)
- Drawer menu groups filtered by permissions (same logic as web)
- Each screen calls tRPC endpoints via the apiClient
- GPS native for clock-in/out
- Offline queue for time entries

## Menu Structure (matching web)
1. Dashboard
2. Operations: Time Tracking, My Hours, Daily Logs, Field Media, Active Workers, Projects, Live Map, Contractors
3. Team: Employees, Payroll, Production Pay
4. Job Costing: Estimates, Receivables, Expenses, Job Cost
5. Fleet: Vehicles, Dispatch, Trip Log, Mileage, Cost Report
6. Inventory: Catalog, Items, Warehouses, Vendors, POs, Vendor Invoices
7. Tools: SDS Library, Reports, Location Report
8. Referral Program
9. Settings: Departments, Work Types, Classifications, Job Roles, Company Profile, Billing, Access Roles, Admin Panel

## API Integration
- Base URL: https://crew-cwm.com
- All endpoints: /api/trpc/{procedure}
- Auth: Cookie-based (app_session_id)
- Serialization: superjson (dates as ISO strings in JSON)

## Key tRPC Procedures Used
- auth.localLogin → Login
- auth.me → Get current user
- auth.logout → Logout
- roles.myPermissions → Get user permissions
- time.* → Time tracking
- employee.* → Team management
- project.* → Projects
- payroll.* → Payroll reports
- fleet.* → Fleet management
- inventory.* → Inventory
- estimates.* → Estimates
- expenses.* → Expenses
