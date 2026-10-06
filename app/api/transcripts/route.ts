import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Transcripts API] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { meeting_title, content, status } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Transcript content is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .insert({
        meeting_title: meeting_title?.trim() || 'Untitled Meeting',
        content: content.trim(),
        status: status || 'uploaded',
      })
      .select()
      .single()

    if (error) {
      console.error('[Transcripts API] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('transcripts')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('[Transcripts API] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('transcripts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Transcripts API] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
