import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseTranscript } from '@/lib/claude'
import type { Transcript } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcriptId, meeting_title, content } = body

    let transcript: Transcript | null = null

    // 1. If existing transcript ID provided, fetch it
    if (transcriptId) {
      const { data, error: tErr } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('id', transcriptId)
        .single()

      if (tErr || !data) {
        return NextResponse.json({ error: 'Transcript not found in database' }, { status: 404 })
      }
      transcript = data as Transcript
    } 
    // 2. Otherwise if title and content provided, save it directly via supabaseAdmin
    else if (content?.trim()) {
      const { data, error: insertErr } = await supabaseAdmin
        .from('transcripts')
        .insert({
          meeting_title: meeting_title?.trim() || 'Untitled Meeting',
          content: content.trim(),
          status: 'processing',
        })
        .select()
        .single()

      if (insertErr || !data) {
        console.error('[Transcripts Parse API] Failed to insert transcript:', insertErr)
        return NextResponse.json({ 
          error: `Failed to save transcript: ${insertErr?.message || 'Database insert error'}` 
        }, { status: 500 })
      }
      transcript = data as Transcript
    } else {
      return NextResponse.json({ error: 'Missing transcript content or transcriptId' }, { status: 400 })
    }

    // Mark as processing
    await supabaseAdmin
      .from('transcripts')
      .update({ status: 'processing' })
      .eq('id', transcript.id)

    // Fetch team members
    const { data: members, error: mErr } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('is_active', true)

    if (mErr || !members) {
      console.error('[Transcripts Parse API] Failed to fetch team members:', mErr)
      return NextResponse.json({ error: 'Failed to fetch team members from database' }, { status: 500 })
    }

    // Parse with AI (GLM / Claude)
    const { tasks, error: parseError } = await parseTranscript(transcript.content, members)

    if (parseError && tasks.length === 0) {
      return NextResponse.json({ error: parseError, transcript }, { status: 500 })
    }

    // Save extracted tasks back to transcript
    await supabaseAdmin
      .from('transcripts')
      .update({ status: 'reviewed', ai_extracted_tasks: tasks })
      .eq('id', transcript.id)

    return NextResponse.json({ transcript: { ...transcript, status: 'reviewed', ai_extracted_tasks: tasks }, tasks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[Transcripts Parse API Error]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

