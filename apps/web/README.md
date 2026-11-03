# Web Application (SAP Fiori Horizon)

Next.js 16 (App Router) + `@ui5/webcomponents-react` Morning Horizon theme.

## Architecture

- **Shell:** `components/fiori/FioriShell.tsx` (ShellBar + SideNavigation)
- **Theme:** `components/fiori/FioriProvider.tsx` (`setTheme('sap_horizon')`)
- **Pages:**
  - Executive Dashboard (`app/(app)/dashboard`)
  - HRIS (`app/(app)/hris/*` - Attendance, Employees, Ranking, Dispatch)
  - Tasks (`app/(app)/tasks/*`)
  - Reports (`app/(app)/reports/*`)
  - Supervisors (`app/(app)/supervisors/*`)
  - Agronomy (`app/(app)/agronomy/*`)
  - Commerce (`app/(app)/commerce/*` - Catalog, Orders, Approvals, GMV)
  - Learning (`app/(app)/learning/*`)
  - Public Auth (`app/(auth)/login/*`)
- **API Endpoints:** `app/api/*`
