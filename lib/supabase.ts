import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aozyczhsstbnsonfgdkd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenljemhzc3RibnNvbmZnZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODQwNjMsImV4cCI6MjEwNjE2MDA2M30.kxtWnJjpV0p95htEM-8Dea25lOKcxHfWYnBorv0tmnw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
