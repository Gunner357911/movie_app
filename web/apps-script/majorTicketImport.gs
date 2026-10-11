/**
 * Imports Major Cineplex ticket confirmation emails into the movie app.
 * Setup: see web/README.md ("Auto-import from Major Cineplex emails").
 *
 * Privacy: the only Gmail calls are GmailApp.search with SENDER_QUERY below (plus a date
 * limit), with read-only scope (appsscript.json). Only title, watch date, booking number and
 * the poster image are sent to Supabase; nothing else from the email leaves Gmail.
 */

// Fixed query: only Major Cineplex booking confirmations are ever opened.
const SENDER_QUERY = 'from:majorcineplex.com "Booking number"'
const RECENT_QUERY = SENDER_QUERY + ' newer_than:30d'
// One-off history import (dryRunBackfill / importBackfill).
const BACKFILL_QUERY = SENDER_QUERY + ' after:2025/01/01'
const PROCESSED_KEY = 'processedMessageIds'
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
// Apps Script stops a run at 6 minutes; stop earlier so the log says how far it got.
const TIME_BUDGET_MS = 4.5 * 60 * 1000

/** Run by the time trigger: emails from the last 30 days. */
function importTickets() {
  const processed = loadProcessed_()
  importMessages_(findMessages_(RECENT_QUERY), processed)
  saveProcessed_(processed)
}

/**
 * Shows what importTickets would do with each email, without writing anything.
 * Run this first, and fix any wrong ATTACH / NEW by hand in the app before importing.
 */
function dryRun() {
  previewMessages_(findMessages_(RECENT_QUERY))
}

/** Like dryRun, but for every Major email since 1 Jan 2025. */
function dryRunBackfill() {
  previewMessages_(findMessages_(BACKFILL_QUERY))
}

/**
 * One-off import of every Major email since 1 Jan 2025. Safe to run again: already imported
 * bookings are skipped, so if the log says it ran out of time, just run it again.
 */
function importBackfill() {
  // Doesn't use the processed list: the booking_number check in the database prevents duplicates.
  importMessages_(findMessages_(BACKFILL_QUERY), [])
}

function importMessages_(messages, processed) {
  const started = Date.now()
  const counts = { done: 0, skipped: 0, failed: 0 }
  for (const message of messages) {
    if (processed.includes(message.getId())) continue
    if (Date.now() - started > TIME_BUDGET_MS) {
      console.warn('Out of time after ' + counts.done + ' email(s): run again to continue')
      break
    }
    try {
      const ticket = parseTicket_(message)
      if (!ticket) {
        console.warn('CANNOT PARSE  ' + message.getSubject() + ' (' + message.getDate().toDateString() + ')')
        processed.push(message.getId())
        counts.skipped++
        continue
      }
      const match = matchTicket_(ticket)
      if (match.action === 'ambiguous') {
        // Left unprocessed: once the duplicates for that date are fixed by hand it imports itself.
        console.warn(describe_(ticket, match))
        counts.skipped++
        continue
      }
      // Only fetch the poster when the movie will be created or doesn't have one yet.
      const needsPoster = match.action === 'insert' || (match.action !== 'already_imported' && !match.has_poster)
      const posterUrl = needsPoster ? uploadPoster_(message, ticket) : null
      callImport_(ticket, posterUrl)
      console.log(describe_(ticket, match))
      processed.push(message.getId())
      counts.done++
    } catch (err) {
      // Not marked as processed, so it is retried on the next run.
      console.error('Failed on "' + message.getSubject() + '": ' + err)
      counts.failed++
    }
  }
  console.log('Done: ' + counts.done + ' processed, ' + counts.skipped + ' need attention, ' + counts.failed + ' failed')
}

function previewMessages_(messages) {
  console.log(messages.length + ' matching email(s)')
  const started = Date.now()
  for (const message of messages) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      console.warn('Out of time: preview stopped early')
      break
    }
    const ticket = parseTicket_(message)
    if (!ticket) {
      console.warn('CANNOT PARSE  ' + message.getSubject() + ' (' + message.getDate().toDateString() + ')')
      continue
    }
    console.log(describe_(ticket, matchTicket_(ticket)))
  }
}

/** Run once to import every 10 minutes. */
function installTrigger() {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === 'importTickets') ScriptApp.deleteTrigger(t)
  }
  ScriptApp.newTrigger('importTickets').timeBased().everyMinutes(10).create()
}

function findMessages_(query) {
  const messages = []
  const pageSize = 100
  for (let start = 0; ; start += pageSize) {
    const threads = GmailApp.search(query, start, pageSize)
    for (const thread of threads) messages.push(...thread.getMessages())
    if (threads.length < pageSize) break
  }
  // Oldest first, so the history reads in order.
  return messages.sort((a, b) => a.getDate() - b.getDate())
}

function parseTicket_(message) {
  const f = extractFields_(message)
  return f.title && f.date && f.booking ? { title: f.title, date: f.date, booking: f.booking, posterSrc: f.posterSrc } : null
}

/**
 * Pulls each field from the plain-text body, falling back to text rendered from the HTML
 * (what you see when copying from Gmail). Missing fields are null.
 */
function extractFields_(message) {
  const html = message.getBody()
  const texts = [message.getPlainBody(), htmlToText_(html)]
  const find = (re) => {
    for (const t of texts) {
      const m = t.match(re)
      if (m) return m
    }
    return null
  }

  const posterImg = findPosterImg_(html)
  let title = posterImg && posterImg.alt.replace(/\s*poster$/i, '').trim()
  if (!title) {
    const m = find(/^\s*(.+?)\s+poster\s*$/im)
    title = m && m[1].trim()
  }

  let date = null
  const dm = find(/Date and time[^0-9]{0,40}?(\d{1,2})\s*([A-Za-z]{3})[A-Za-z]*\.?,?\s*(\d{4})/i)
  if (dm && MONTHS[dm[2].toLowerCase()]) {
    date = [dm[3], pad_(MONTHS[dm[2].toLowerCase()]), pad_(dm[1])].join('-')
  } else {
    // "Oct 3, 2026" order
    const md = find(/Date and time[^A-Za-z0-9]{0,40}?([A-Za-z]{3})[A-Za-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i)
    if (md && MONTHS[md[1].toLowerCase()]) date = [md[3], pad_(MONTHS[md[1].toLowerCase()]), pad_(md[2])].join('-')
  }

  const bm = find(/Booking (?:number|no\.?|id)[^0-9]{0,40}?(\d{4,})/i)

  return { title: title || null, date: date, booking: bm ? bm[1] : null, posterSrc: posterImg ? posterImg.src : null, texts: texts, html: html }
}

/**
 * Says which field could not be read and shows only ~80 characters around each label,
 * not the whole email. Paste the log (hide anything you like) to get the parser fixed.
 */
function debugParse() {
  // The first two emails since 2025 that can't be parsed (or the first two overall if all parse).
  const messages = findMessages_(BACKFILL_QUERY)
  const failing = messages.filter((m) => !parseTicket_(m))
  console.log(messages.length + ' matching email(s), ' + failing.length + ' cannot be parsed')
  for (const message of (failing.length ? failing : messages).slice(0, 2)) {
    const f = extractFields_(message)
    console.log('--- ' + message.getSubject() + ' (' + message.getDate().toDateString() + ')')
    console.log('title=' + f.title + ' | date=' + f.date + ' | booking=' + f.booking + ' | poster=' + (f.posterSrc ? 'found' : 'none'))
    const alts = (f.html.match(/<img\b[^>]*>/gi) || []).map((t) => decodeEntities_(attr_(t, 'alt')))
    console.log('img alts: ' + JSON.stringify(alts))
    ;['plain', 'html'].forEach((name, i) => {
      const t = f.texts[i]
      console.log(name + ' text length ' + t.length)
      for (const label of ['poster', 'Date', 'Booking']) {
        const at = t.search(new RegExp(label, 'i'))
        console.log('  ' + label + ': ' + (at < 0 ? '(not found)' : JSON.stringify(t.slice(Math.max(0, at - 30), at + 50))))
      }
    })
  }
}

function htmlToText_(html) {
  return decodeEntities_(
    html
      .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<img\b[^>]*>/gi, (tag) => '\n' + attr_(tag, 'alt') + '\n')
      .replace(/<br\s*\/?>|<\/(p|div|td|th|tr|h\d|li|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n[\s]*/g, '\n')
    .trim()
}

function findPosterImg_(html) {
  const tags = html.match(/<img\b[^>]*>/gi) || []
  for (const tag of tags) {
    const alt = decodeEntities_(attr_(tag, 'alt'))
    if (/poster$/i.test(alt.trim())) return { alt: alt, src: decodeEntities_(attr_(tag, 'src')) }
  }
  return null
}

/** Copies the poster into the public "posters" bucket. Returns its URL, or null on failure. */
function uploadPoster_(message, ticket) {
  try {
    const blob = posterBlob_(message, ticket.posterSrc)
    if (!blob) return null
    const type = blob.getContentType() || 'image/jpeg'
    const path = ticket.booking + '.' + (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const { url } = config_()
    supabaseFetch_('/storage/v1/object/posters/' + path, {
      method: 'post',
      contentType: type,
      payload: blob.getBytes(),
      headers: { 'x-upsert': 'true' },
    })
    return url + '/storage/v1/object/public/posters/' + path
  } catch (err) {
    console.warn('Poster skipped: ' + err)
    return null
  }
}

function posterBlob_(message, src) {
  if (src && /^https?:/i.test(src)) {
    const res = UrlFetchApp.fetch(src, { muteHttpExceptions: true })
    return res.getResponseCode() === 200 ? res.getBlob() : null
  }
  // cid: images are inline attachments. Apps Script doesn't expose Content-ID,
  // so prefer one named like a poster, else the largest image that isn't a QR code or logo.
  const images = message
    .getAttachments({ includeInlineImages: true, includeAttachments: false })
    .filter((a) => /^image\//.test(a.getContentType()) && !/qr|logo/i.test(a.getName()))
  const named = images.find((a) => /poster/i.test(a.getName()))
  if (named) return named.copyBlob()
  images.sort((a, b) => b.getSize() - a.getSize())
  return images.length ? images[0].copyBlob() : null
}

function matchTicket_(ticket) {
  const res = supabaseFetch_('/rest/v1/rpc/match_major_ticket', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ p_name: ticket.title, p_date: ticket.date, p_booking: ticket.booking }),
  })
  const body = JSON.parse(res.getContentText())
  return Array.isArray(body) ? body[0] : body
}

function describe_(ticket, match) {
  const email = '"' + ticket.title + '" ' + ticket.date + ' #' + ticket.booking
  switch (match.action) {
    case 'already_imported':
      return 'SKIP     ' + email + ' (already imported as movie ' + match.movie_id + ')'
    case 'attach':
      return 'ATTACH   ' + email + ' -> movie ' + match.movie_id + ' "' + match.movie_name + '" (adds poster, keeps scores)'
    case 'rewatch':
      return 'REWATCH  ' + email + ' -> movie ' + match.movie_id + ' "' + match.movie_name + '" (same movie, no new row)'
    case 'ambiguous':
      return 'AMBIGUOUS ' + email + ' (several movies on that date, none with this title: fix the title in the app)'
    default:
      return 'NEW      ' + email + ' (adds a movie with empty scores)'
  }
}

function callImport_(ticket, posterUrl) {
  supabaseFetch_('/rest/v1/rpc/import_major_ticket', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ p_name: ticket.title, p_date: ticket.date, p_booking: ticket.booking, p_poster_url: posterUrl }),
  })
}

function supabaseFetch_(path, options) {
  const { url, key } = config_()
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys must not.
  const auth = key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}
  options.headers = Object.assign({ apikey: key }, auth, options.headers)
  options.muteHttpExceptions = true
  const res = UrlFetchApp.fetch(url + path, options)
  if (res.getResponseCode() >= 300) throw new Error(path + ' -> ' + res.getResponseCode() + ' ' + res.getContentText())
  return res
}

/** Keys live in Project Settings → Script Properties, never in this file. */
function config_() {
  const props = PropertiesService.getScriptProperties()
  const url = props.getProperty('SUPABASE_URL')
  const key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Script Properties')
  return { url: url.replace(/\/$/, ''), key: key }
}

function loadProcessed_() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty(PROCESSED_KEY) || '[]')
}

function saveProcessed_(ids) {
  // Emails older than 30 days drop out of RECENT_QUERY, so a short history is enough.
  PropertiesService.getScriptProperties().setProperty(PROCESSED_KEY, JSON.stringify(ids.slice(-200)))
}

function attr_(tag, name) {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i'))
  return m ? m[2] || m[3] || '' : ''
}

function decodeEntities_(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function pad_(n) {
  return String(n).padStart(2, '0')
}
