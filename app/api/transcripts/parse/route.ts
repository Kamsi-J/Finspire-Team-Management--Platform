import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseTranscript } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { transcriptId } = await req.json()
  if (!transcriptId) return NextResponse.json({ error: 'Missing transcriptId' }, { status: 400 })

  // Fetch the transcript
  const { data: transcript, error: tErr } = await supabaseAdmin
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single()

  if (tErr || !transcript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
  }

  // Mark as processing
  await supabaseAdmin
    .from('transcripts')
    .update({ status: 'processing' })
    .eq('id', transcriptId)

  // Fetch team members
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('is_active', true)

  if (!members) {
    return NextResponse.json({ error: 'No team members found' }, { status: 500 })
  }

  // Parse with Claude
  const extracted = await parseTranscript(transcript.content, members)

  // Save extracted tasks back to transcript
  await supabaseAdmin
    .from('transcripts')
    .update({ status: 'reviewed', ai_extracted_tasks: extracted })
    .eq('id', transcriptId)

  return NextResponse.json({ tasks: extracted })
}
