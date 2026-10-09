# 💡 Muro de Ideas en Vivo

Cada persona entra con su correo y contraseña, publica ideas cortas (máx. 280 letras),
puede editar o borrar las suyas y ve las ideas de todos al instante. Arriba hay un contador
de personas conectadas en tiempo real.

Hecho con React + Vite y Supabase (cuentas, base de datos y tiempo real).

## Ponerlo a andar

1. **Base de datos:** en tu proyecto de [Supabase](https://supabase.com/dashboard) abre
   *SQL Editor*, pega todo [`supabase/setup.sql`](supabase/setup.sql) y pulsa **Run**.
2. **(Recomendado)** *Authentication → Sign In / Providers → Email* → apaga **Confirm email**
   para que la gente entre apenas se registra.
3. **Llaves:** copia `.env.example` como `.env` y pega la *Project URL* y la *anon / publishable key*
   (*Project Settings → Data API / API Keys*).
4. Instala y arranca:

   ```bash
   pnpm install
   pnpm dev
   ```

## Publicar en Vercel

En Vercel agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y luego pon la
URL de Vercel en Supabase → *Authentication → URL Configuration → Site URL*.
