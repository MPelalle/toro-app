This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Base de datos: Supabase + Prisma

1. Copiá `.env.example` a `.env` y pegá las dos URLs de **Supabase Dashboard → Connect → ORMs → Prisma**.
2. Instalá dependencias con `npm install`.
3. Aplicá la migración inicial: `npm run db:deploy` (o `npm run db:migrate` durante desarrollo).
4. Generá el cliente con `npm run db:generate`. Luego podés usar `npm run db:studio` para inspeccionar los datos.

`DATABASE_URL` está destinada a la app en tiempo de ejecución (pooler) y `DIRECT_URL` a migraciones y Studio. El esquema incluye usuarios, hábitos y check-ins diarios; el resultado semanal se calcula desde estos últimos para no guardar métricas obsoletas.

Mientras no haya autenticación con Supabase Auth, la sección de hábitos usa `HABITS_USER_ID` como propietario de los registros. Está documentado en `.env.example`; al agregar login, reemplazalo por el UUID de la sesión autenticada.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
