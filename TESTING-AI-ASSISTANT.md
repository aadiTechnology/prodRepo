# Testing the AI Assistant (Role CRUD)

## Prerequisites

1. **Backend (FastAPI)** running, e.g. from repo root or `apps/fastapi`:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8022
   ```
   (Use the same port as `VITE_API_BASE_URL` in the frontend.)

2. **Frontend (React)** running:
   ```bash
   cd apps/web && npm run dev
   ```

3. **Environment**
   - Frontend: `apps/web/.env.development` (or `.env`) should have `VITE_API_BASE_URL=http://localhost:8022` (or your API URL).
   - Backend: Optional. Set `OPENAI_API_KEY` in `.env` for real LLM intent detection. If unset, only "Show roles"–style requests are handled (fallback to VIEW_ROLES → navigate to `/roles`).

## Steps

1. **Log in** as a user with an admin role (e.g. SUPER_ADMIN or TENANT_ADMIN). The AI interpret endpoint requires admin.

2. **Open the AI Assistant** in the browser:
   ```
   http://localhost:5173/ai-assistant
   ```
   (Replace host/port if your dev server uses a different one.)

3. **Try these in the chat** (type and send, or use the mic):
   - **Show roles** → should navigate to `/roles`.
   - **Add role Admin** → should call `POST /roles` with a payload (code/name, etc.); you’ll see success or validation errors in the chat.
   - **Delete role \<name\>** → e.g. "Delete role Teacher" → resolves role by name and calls `DELETE /roles/{id}`.
   - **Update role \<name\> to \<new name\>** → e.g. "Update role Parent to Guardian" → resolves role by name and calls `PUT /roles/{id}` with the new name.

4. **Mic (optional)**  
   Use the microphone icon to speak; the browser will ask for permission. Supported in Chrome/Edge; other browsers may not support Web Speech API.

## Quick API check (without UI)

With a valid JWT for an admin user:

```bash
curl -X POST http://localhost:8022/api/ai/interpret \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"user_text\": \"Show roles\"}"
```

Expected: JSON with `"intent":"VIEW_ROLES"`, `"action":"NAVIGATE"`, `"endpoint":"/roles"`.

## Troubleshooting

- **401** → Not logged in or token expired. Log in again.
- **403** → User is not admin. Use an admin account.
- **No LLM behavior** → Set `OPENAI_API_KEY` in the FastAPI `.env`; without it, only fallback (e.g. VIEW_ROLES) is used.
- **CORS** → Ensure backend CORS allows your frontend origin (e.g. `http://localhost:5173`).
