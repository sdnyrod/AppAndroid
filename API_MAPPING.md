# API Mapping: Android App → Backend tRPC Procedures

## Users/Employees
- `users.list` → List all users (employees)
- `users.getById` → Get user details
- `users.getEmployees` → Get employees list
- `users.getMyTeam` → Get supervisor's team
- `users.create` → Create employee
- `users.update` → Update employee
- `users.toggleAccess` → Enable/disable access
- `users.changeRole` → Change user role
- `users.delete` → Delete user

## Projects
- `projects.list` → List all projects
- `projects.getActive` → Get active projects
- `projects.getById` → Get project details
- `projects.create` → Create project
- `projects.update` → Update project
- `projects.delete` → Delete project

## Time Tracking
- `time.getMyAssignedProjects` → Projects available for clock-in
- `time.getSuggestedProject` → AI-suggested project
- `time.validateGeofence` → Validate GPS position
- `time.getAllActive` → All currently clocked-in workers
- `time.getActive` → Current user's active entry
- `time.clockIn` → Clock in (requires projectId, latitude, longitude)
- `time.clockOut` → Clock out (requires latitude, longitude)
- `time.getMyEntries` → Current user's time entries
- `time.getUserEntries` → Specific user's entries
- `time.getProjectEntries` → Entries by project
- `time.getAll` → All time entries
- `time.supervisorClockIn` → Clock in on behalf of employee
- `time.supervisorClockOut` → Clock out on behalf of employee
- `time.createManualEntry` → Create manual time entry
- `time.editTimeEntry` → Edit time entry
- `time.deleteTimeEntry` → Delete time entry
- `time.approve` → Approve time entries

## Payroll
- `time.getPayrollReport` → Payroll report data
- `time.getPayrollWeeks` → Available payroll weeks
- `time.getLastPaidWeek` → Last paid week
- `time.markWeekPaid` → Mark week as paid
- `time.getWeekPayments` → Week payment details
- `time.getOpenBalances` → Open balances

## Dashboard
- `dashboard.getStats` → Dashboard statistics

## Estimates
- `estimates.list` → List estimates
- `estimates.getById` → Get estimate details
- `estimates.getByProject` → Estimates by project
- `estimates.create` → Create estimate
- `estimates.update` → Update estimate
- `estimates.delete` → Delete estimate

## Expenses
- `expenses.list` → List expenses
- `expenses.getById` → Get expense details
- `expenses.getByProject` → Expenses by project
- `expenses.create` → Create expense
- `expenses.update` → Update expense
- `expenses.delete` → Delete expense
- `expenses.summary` → Expense summary

## Job Cost
- `jobCost.getProjectSummary` → Job cost by project

## Fleet/Trucks
- `trucks.list` → List vehicles
- `trucks.getById` → Get vehicle details
- `trucks.create` → Create vehicle
- `trucks.update` → Update vehicle
- `trucks.delete` → Delete vehicle

## Inventory
- `inventory.list` → List inventory items
- `inventory.byLocation` → Items by location
- `inventory.lowStock` → Low stock items
- `inventory.upsert` → Add/update stock
- `inventory.transfer` → Transfer between warehouses

## Purchase Orders
- `purchaseOrders.list` → List POs
- `purchaseOrders.getById` → PO details
- `purchaseOrders.create` → Create PO
- `purchaseOrders.updateStatus` → Update PO status
- `purchaseOrders.receive` → Receive PO

## Vendors
- `vendors.list` → List vendors
- `vendors.getById` → Vendor details
- `vendors.create` → Create vendor
- `vendors.update` → Update vendor
- `vendors.delete` → Delete vendor

## Warehouses
- `warehouses.list` → List warehouses
- `warehouses.getById` → Warehouse details
- `warehouses.create` → Create warehouse
- `warehouses.update` → Update warehouse
- `warehouses.delete` → Delete warehouse

## Daily Logs
- `dailyLog.getAll` → All daily logs
- `dailyLog.getByProject` → Logs by project
- `dailyLog.submitAudio` → Submit audio log

## Field Media
- `fieldMedia.getAll` → All field media
- `fieldMedia.getByProject` → Media by project
- `fieldMedia.upload` → Upload media
- `fieldMedia.delete` → Delete media

## Dispatch
- `dispatch.getByDate` → Dispatch board by date
- `dispatch.create` → Create dispatch
- `dispatch.update` → Update dispatch
- `dispatch.delete` → Delete dispatch

## Settings
- `departments.list` → List departments
- `workTypes.list` → List work types
- `classifications.list` → List classifications
- `roles.list` → List roles
- `roles.myPermissions` → Get current user permissions

## Referrals
- `referrals.listAll` → List all referrals
