All data fetching currently uses mockData.js. When Supabase is connected, replace mock calls with Supabase queries in each page/component. Keep all Supabase logic in a /lib/api/ folder with one file per domain:
- /lib/api/students.js
- /lib/api/tickets.js
- /lib/api/sessions.js
- /lib/api/users.js
- /lib/api/scanLogs.js

Each api file exports async functions (e.g. getStudents, createStudent, updateTicket). During the UI-only phase these functions return mock data. After Supabase is connected they will be swapped to real queries without changing any component code.

---

## SUPABASE DATABASE SCHEMA (for later integration)

### Table: profiles (extends Supabase auth.users)
- id uuid PK (FK → auth.users.id)
- full_name text
- role text CHECK IN ('super_admin', 'admin', 'scanner_operator')
- assigned_gate text nullable
- is_active boolean DEFAULT true
- must_change_password boolean DEFAULT true
- created_by uuid nullable FK → profiles.id
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()

### Table: sessions
- id uuid PK DEFAULT gen_random_uuid()
- name text NOT NULL
- date date NOT NULL
- time time NOT NULL
- venue text NOT NULL
- status text CHECK IN ('upcoming', 'active', 'completed') DEFAULT 'upcoming'
- created_at timestamptz DEFAULT now()

### Table: students
- id uuid PK DEFAULT gen_random_uuid()
- student_number text UNIQUE NOT NULL
- full_name text NOT NULL
- faculty text NOT NULL
- qualification text NOT NULL
- session_id uuid FK → sessions.id
- created_at timestamptz DEFAULT now()

### Table: guest_tickets
- id uuid PK DEFAULT gen_random_uuid()
- student_id uuid FK → students.id ON DELETE CASCADE
- ticket_code uuid UNIQUE DEFAULT gen_random_uuid()
- guest_label text CHECK IN ('Guest 1', 'Guest 2')
- is_used boolean DEFAULT false
- is_revoked boolean DEFAULT false
- scanned_at timestamptz nullable
- scanned_by uuid nullable FK → profiles.id
- entry_point text nullable
- created_at timestamptz DEFAULT now()

### Table: scan_logs
- id uuid PK DEFAULT gen_random_uuid()
- ticket_code text NOT NULL
- student_id uuid nullable FK → students.id
- scan_result text CHECK IN ('ADMITTED', 'REJECTED_DUPLICATE', 'REJECTED_INVALID', 'REJECTED_WRONG_SESSION', 'REJECTED_REVOKED')
- rejection_reason text nullable
- scanned_at timestamptz DEFAULT now()
- scanned_by uuid nullable FK → profiles.id
- entry_point text nullable

### Table: auth_logs
- id uuid PK DEFAULT gen_random_uuid()
- user_id uuid nullable FK → profiles.id
- email text
- event_type text CHECK IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET_REQUESTED')
- ip_address text nullable
- user_agent text nullable
- created_at timestamptz DEFAULT now()

### Table: admin_audit_logs
- id uuid PK DEFAULT gen_random_uuid()
- performed_by uuid FK → profiles.id
- action text NOT NULL
- target_table text
- target_id uuid nullable
- details jsonb nullable
- created_at timestamptz DEFAULT now()

### Supabase RLS Policies (to implement later)
- profiles: users can only read their own row; super_admin can read all
- students: admin and super_admin can CRUD; scanner_operator can only SELECT
- guest_tickets: admin and super_admin can CRUD; scanner_operator can SELECT + UPDATE is_used
- scan_logs: all authenticated users can INSERT; admin and super_admin can SELECT all; operators can SELECT their own
- sessions: admin and super_admin can CRUD; operators can SELECT active sessions

### Supabase Seed Script (scripts/seed.sql)
- Insert 2 ceremony sessions
- Insert 1 super_admin profile (linked to a Supabase auth user)
- Insert 1 admin profile
- Insert 3 scanner_operator profiles
- Insert 20 students spread across sessions and faculties
- Insert 40 guest_tickets (2 per student)
- Insert 15 scan_log entries showing a mix of results

---

## ADDITIONAL NOTES

- All forms use controlled React state (no libraries like Formik)
- No TypeScript — plain JavaScript only
- Tailwind CSS for all styling — no CSS modules or styled-components
- All modals use React portals (ReactDOM.createPortal into document.body)
- Use localStorage to persist the logged-in mock user across page refreshes during development
- Ensure every page has an appropriate empty state component when there is no data
- Ensure loading skeleton states exist for tables and stat cards
- Every destructive action (revoke ticket, deactivate user, delete session) must show a confirmation modal before executing
- The scanner page must work well on a phone — test all touch targets at minimum 44×44px
- Add a floating "Back to Top" button on long pages
- Add keyboard shortcut ESC to close any open modal

------------------------TABLE QUERIES -------------------------------------------------

create type public.task_status as enum ('Pending', 'In Progress', 'Completed', 'Cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  created_date date not null default current_date,
  due_date date not null,
  status public.task_status not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Milestones (ordered list support via position)
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  target_date date,
  completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now()
);
-- ---------- Indexes ----------
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_user_due_date on public.tasks(user_id, due_date);
create index if not exists idx_milestones_task_id on public.milestones(task_id);
create index if not exists idx_milestones_task_position on public.milestones(task_id, position);
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_comments_task_created_at on public.comments(task_id, created_at desc);
