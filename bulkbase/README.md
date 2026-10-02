# Bulkbase (Firebase Realtime Database)
frontend/  the website (index.html shop, admin.html super admin, firebase.js config)
firebase/  database.rules.json (paste into Firebase console > Realtime Database > Rules)

Setup (project bulkbase-20b55):
1. Authentication > Sign-in method > enable Email/Password, then Users > Add user (your admin email + password).
2. Realtime Database > Rules: paste firebase/database.rules.json, change the admin email to yours, Publish.

Run: serve the frontend folder over http (VS Code "Live Server" > Go Live, or `npx serve frontend`).
Shop: /index.html   Admin: /admin.html
