# Finspire Team OS

WhatsApp-native team management: transcript parsing, task assignment, automated reminders.

## Setup (do these in order)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at supabase.com
2. Go to SQL Editor and run the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Copy your Project URL and anon/service keys from Settings → API

### 3. Set up Meta WhatsApp Cloud API
1. Go to developers.facebook.com → Create App → Business
2. Add the WhatsApp product
3. Under WhatsApp → API Setup, get your Phone Number ID and temporary token
4. Set your webhook URL to: `https://your-domain.com/api/whatsapp`
5. Set your Verify Token (any string you choose)
6. Subscribe to the `messages` webhook field

### 4. Configure environment variables
```bash
cp .env.local.example .env.local
# Fill in all values in .env.local
```

### 5. Get Claude API key
1. Go to console.anthropic.com
2. Create an API key
3. Add to ANTHROPIC_API_KEY in .env.local

### 6. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 7. Create your admin account
1. In Supabase dashboard → Authentication → Users → Add user
2. Use your email + password
3. In the SQL Editor, run:
   ```sql
   INSERT INTO team_members (name, role, whatsapp_number, email, is_admin)
   VALUES ('Your Name', 'CEO', '2348012345678', 'you@email.com', true);
   ```

### 8. Deploy to Vercel
```bash
npm install -g vercel
vercel
# Add all .env.local values as environment variables in Vercel dashboard
```

### 9. Set up scheduled messages (after deploy)
In Supabase SQL Editor:
```sql
-- Monday 7am UTC: weekly digest
select cron.schedule('weekly-digest', '0 7 * * 1',
  $$select net.http_post(url:='https://your-project.supabase.co/functions/v1/send-scheduled-messages',
    body:='{"type":"weekly_digest"}'::jsonb)$$);

-- Daily 8am UTC: reminders
select cron.schedule('daily-reminders', '0 8 * * *',
  $$select net.http_post(url:='https://your-project.supabase.co/functions/v1/send-scheduled-messages',
    body:='{"type":"daily_reminders"}'::jsonb)$$);

-- Friday 5pm UTC: performance report
select cron.schedule('performance-report', '0 17 * * 5',
  $$select net.http_post(url:='https://your-project.supabase.co/functions/v1/send-scheduled-messages',
    body:='{"type":"performance_report"}'::jsonb)$$);
```

### 10. Deploy Supabase Edge Function
```bash
npx supabase login
npx supabase functions deploy send-scheduled-messages --project-ref YOUR_PROJECT_REF
```

## Project structure
```
app/
  (auth)/login/        Login page
  (dashboard)/         Admin dashboard
    page.tsx           Overview
    tasks/             Task management
    members/           Team members + WhatsApp numbers
    meetings/          Meeting scheduler
    broadcast/         Send messages to whole team
    transcripts/       Upload + AI parse meeting transcripts
  api/
    whatsapp/          WhatsApp webhook (inbound messages)
    transcripts/parse/ Claude AI parsing endpoint
    meetings/notify/   Send meeting notification to team
    broadcast/         Send broadcast to team
lib/
  supabase.ts          Supabase client
  whatsapp.ts          WhatsApp Cloud API client
  claude.ts            Claude AI transcript parser
supabase/
  migrations/          Database schema
  functions/           Edge Functions (scheduled messages)
types/                 TypeScript types
```
