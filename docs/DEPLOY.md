# Deploying PRETAG AMIS to Vercel

The app is a standard Next.js project. Vercel builds it with `npm run build`.

## One-time

1. Create a free account at <https://vercel.com> (sign in with GitHub, GitLab or email).
2. Create an access token: <https://vercel.com/account/tokens> -> **Create Token**
   (name it `pretag-deploy`, scope: full, no expiry or 1 year). Copy it.

## Deploy

From the project folder:

```
npx vercel link --yes --token <TOKEN>        # creates the Vercel project
# set the three environment variables (Production):
printf %s "<SUPABASE_URL>"        | npx vercel env add NEXT_PUBLIC_SUPABASE_URL      production --token <TOKEN>
printf %s "<ANON_KEY>"            | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token <TOKEN>
printf %s "<SERVICE_ROLE_KEY>"    | npx vercel env add SUPABASE_SERVICE_ROLE_KEY    production --token <TOKEN>
printf %s "r20"                   | npx vercel env add R20_STORAGE_BUCKET            production --token <TOKEN>
npx vercel deploy --prod --yes --token <TOKEN>
```

The last command prints the live URL, e.g. `https://pretag-ashanti-amis.vercel.app`.

## After the first deploy

In Supabase -> **Authentication -> URL Configuration**:

- Set **Site URL** to the Vercel URL.
- Add the Vercel URL (and `<url>/**`) to **Redirect URLs**.

This makes the password-reset email links point at the live site.

## AI assistant (optional)

The Membership Assistant calls the OpenAI API. To enable it:

1. Add billing to your OpenAI account: <https://platform.openai.com/settings/organization/billing>
2. `OPENAI_API_KEY` is already set on Vercel. If you rotate the key:
   `printf %s "<new key>" | npx vercel env add OPENAI_API_KEY production --force --token <TOKEN>`
   then redeploy.
3. Model defaults to `gpt-4o-mini`; override with `OPENAI_ASSISTANT_MODEL`.

Each question sends a small data snapshot (~1-2k tokens) and gets a short answer -
roughly USD 0.001 per question at current `gpt-4o-mini` rates.

## Updating later

Re-run `npx vercel deploy --prod --yes --token <TOKEN>` from the project folder,
or connect the Vercel project to a Git repository for automatic deploys on push.
