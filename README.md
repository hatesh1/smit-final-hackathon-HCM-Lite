# HCM Lite — AI-Assisted Human Capital Management

> Stack: **MongoDB Atlas + Mongoose · Express.js · React 19 + Vite · Node.js · JWT & bcryptjs · Google Gemini AI (gemini-1.5-flash)**

---

## 1. Project Overview

HCM Lite is a web-based Human Capital Management system with three roles: **Admin**, **HR**, and **Employee**. The system starts empty — no pre-loaded data. Admin sets up the company, HR registers employees, and every number in dashboards and AI answers comes from real actions in the app.

**9 Modules:** Auth & Access · Organization Setup · Employees · Attendance · Leave · Payroll Lite · Dashboards & Analytics · AI Assistant · Comms & Audit

---

## 2. Stack

```
client/    React 19 + Vite + Tailwind CSS + React Router
server/    Node.js + Express.js + Mongoose (MongoDB)
AI:        Google Gemini 1.5 Flash (tool calling)
Auth:      JWT (access + refresh) + bcryptjs
PDF:       jsPDF (payslip generation)
```

---

## 3. How to Run

### Prerequisites
- Node.js 18+
- MongoDB Atlas URI (or local MongoDB)
- Google Gemini API key (free tier at https://aistudio.google.com)

### Server Setup
```bash
cd server
cp .env.example .env
# Edit .env: set MONGO_URI and GEMINI_API_KEY
npm install
npm run dev
```

### Client Setup
```bash
cd client
npm install
npm run dev
```

### Environment Variables (server/.env)
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hcm-lite
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
NODE_ENV=development
```

---

## 4. First Run (for Judges)

1. Open the app — it redirects to `/setup` (first-run wizard)
2. Enter your company name, office hours, GPS location, and Admin credentials
3. Log in as Admin → go to **Organization Setup** → add departments, leave types, public holidays
4. Go to **User Management** → create an HR login
5. Log in as HR → go to **Employee Operations** → register employees (creates their login)
6. Employees log in, change their temporary password, and check in

**No demo data or seed script is needed.** Judges create everything themselves.

---

## 5. Demo Script (5 minutes)

1. **Admin** → Setup Wizard → add company, office hours, department, leave types
2. **Admin** → User Management → create HR login
3. **HR** → Employee Operations → register 2–3 employees with salary
4. **Employee** → signs in, changes password, clicks Check In
5. **Employee** → Leave → types "Need Monday off for a wedding" → confirms pre-filled form
6. **HR** → Leave Approvals → approves it with a comment
7. **HR** → Dashboard → clicks Summarize → asks AI "Who is on leave today?"
8. **HR** → Payroll → creates monthly draft → **Admin** finalizes it
9. **Employee** → Downloads payslip → asks AI for a colleague's salary (gets refused)
10. **Admin** → Audit Log → shows all actions

---

## 6. AI Assistant

- Model: `gemini-1.5-flash` (tool calling)
- API key stored only in server `.env` (never sent to browser)
- Rate limit: 20 requests per user per hour
- Tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`
- Roman Urdu supported
- Employee cannot get colleague salary or company payroll — politely refused

---

## 7. What is Done

All 25 functionalities from the Challenge Brief are implemented:

| # | Feature | Status |
|---|---------|--------|
| 01 | First-run setup | ✅ |
| 02 | Login / logout / change password / role menus | ✅ |
| 03 | Company settings — office hours, grace, weekend, geofence | ✅ |
| 04 | Departments, designations, leave types, quotas, holidays | ✅ |
| 05 | Create HR logins, deactivate, reset | ✅ |
| 06 | Register employee (creates login), edit details | ✅ |
| 07 | Employee directory, search, filters, Employee 360 | ✅ |
| 08 | CSV import dry-run + commit, CSV export | ✅ |
| 09 | Web check-in / check-out | ✅ |
| 10 | Attendance calendar and daily board | ✅ |
| 11 | Attendance correction: request and approve | ✅ |
| 12 | Apply / cancel leave, see balance and history | ✅ |
| 13 | Approve / reject leave with comment | ✅ |
| 14 | Salary structure per employee | ✅ |
| 15 | Monthly payroll draft — create and review | ✅ |
| 16 | Finalize payroll — Admin locks the month | ✅ |
| 17 | Payslips with PDF download | ✅ |
| 18 | Dashboards, KPIs, trends, filters | ✅ |
| 19 | AI assistant chat from real data | ✅ |
| 20 | AI dashboard summary (3–5 bullets) | ✅ |
| 21 | Smart leave: plain text → pre-filled form | ✅ |
| 22 | Policy Q&A (attendance, leave, payroll rules) | ✅ |
| 23 | Announcements — Admin/HR post, Employee reads | ✅ |
| 24 | In-app notifications (leave decisions, payslips) | ✅ |
| 25 | Audit log of all important actions | ✅ |

---

## 8. Security

- All routes check JWT and role on the server — hiding a button is not enough
- Employee can only read their own rows (data scope guard by `employee_id`)
- Gemini API key never leaves the server
- bcrypt password hashing
- Finalized payroll runs are locked (immutable)
