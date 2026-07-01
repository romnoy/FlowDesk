# FlowDesk Rules

## Frontend
- Use React + Vite only. No other frontend frameworks.
- Every component must be in its own separate file.
- Use Tailwind CSS only for styling. No inline styles, no CSS files, no other styling libraries.

## Backend
- Use Node.js + Express only.
- No direct database access from the UI — all data must go through the API.

## Database
- Use SQLite only.
- All queries go through the backend (Express routes). Never expose the DB to the client.

## Project Context
- Before starting any task, read `FlowDesk_PRD.md` and `FlowDesk_Spec.md` located in the project root.
- All features must align with the requirements defined in these documents.

## Code Quality
- Write modular code. Each file should have a single, clear responsibility.
- Follow best practices for the relevant technology (React hooks, Express middleware, etc.).
- Do not leave unused imports, variables, or dead code.
