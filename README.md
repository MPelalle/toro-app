# 🐂 TORO — Become Your Best Version

TORO is a modern **offline-first fitness platform** built to help athletes train smarter, stay consistent, and track every workout without relying on an internet connection.

Designed for lifters who care about progressive overload, performance, and long-term consistency, TORO lets you focus on your training while automatically handling data synchronization in the background.

## ✨ Features

* 🏋️ Create fully customizable workout programs
* 📈 Track weights, reps, sets and progression
* 📊 Compare performance with previous sessions
* ⚡ Instant workout logging with an offline-first architecture
* 🔄 Automatic synchronization when connection is restored
* 📅 Workout history and long-term progress tracking
* ✅ Habit tracking to build consistency
* 🥗 Nutrition module (in development)
* 📱 Installable Progressive Web App (PWA)
* ☁️ Powered by Supabase for secure cloud synchronization

## 🛠 Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase
* PostgreSQL
* Prisma
* IndexedDB
* Progressive Web App (PWA)

## 🎯 Philosophy

Training shouldn't stop because your internet does.

Whether you're in a basement gym, a warehouse, or a place with no signal, TORO keeps working. Every workout is stored locally and synchronized automatically once you're back online.

**No interruptions. No lost progress. Just training.**

## Deploy on Vercel

The deployable Next.js project lives in the `toro/` directory. In Vercel, import the repository and set **Root Directory** to `toro`.

Add every variable from `.env.example` in **Settings > Environment Variables** for the environments you deploy. `DATABASE_URL` is used by the application at runtime, while `DIRECT_URL` is required for Prisma migrations. Set `APP_URL` to the final HTTPS deployment URL, without a trailing slash, so verification emails point to the correct domain.

Vercel runs `npm run db:deploy && npm run build` from `vercel.json`. Configure preview deployments with their own database, or restrict deployment to production until a separate preview database is available, because migrations are applied during each deployment.

---

**TORO — Become Your Best Version.**
