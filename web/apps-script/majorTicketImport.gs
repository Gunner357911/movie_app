/**
 * Imports Major Cineplex ticket confirmation emails into the movie app.
 * Setup: see web/README.md ("Auto-import from Major Cineplex emails").
 *
 * Privacy: the only Gmail call is GmailApp.search(QUERY) below, with read-only scope
 * (appsscript.json). Only title, watch date, booking number and the poster image are sent
 * to Supabase; nothing else from the email leaves Gmail.
 */

// Fixed query: only Major Cineplex booking confirmations are ever opened.
const QUERY = 'from:majorcineplex.com "Booking number" newer_than:30d'
const PROCESSED_KEY = 'processedMessageIds'
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

/** Run by the time trigger. */
function importTickets() {
  const processed = loadProcessed_()
  for (const message of findMessages_()) {
    if (processed.includes(message.getId())) continue
    try {
      const ticket = parseTicket_(message)
      if (!ticket) {
        console.warn('Could not parse email: ' + message.getSubject())
      } else {
        const posterUrl = uploadPoster_(message, ticket)
        callImport_(ticket, posterUrl)
        console.log('Imported ' + ticket.title + ' (' + ticket.date + ')')
      }
      processed.push(message.getId())
    } catch (err) {
      // Not marked as processed, so it is retried on the next run.
      console.error('Failed on "' + message.getSubject() + '": ' + err)
    }
  }
  saveProcessed_(processed)
}

/** Logs what would be imported without writing anything. Run this first. */
function dryRun() {
  const messages = findMessages_()
  console.log(messages.length + ' matching email(s)')
  for (const message of messages) {
    console.log(message.getFrom() + ' | ' + message.getSubject())
    console.log(JSON.stringify(parseTicket_(message)))
  }
}

/** Run once to import every 10 minutes. */
function installTrigger() {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === 'importTickets') ScriptApp.deleteTrigger(t)
  }
  ScriptApp.newTrigger('importTickets').timeBased().everyMinutes(10).create()
}

function findMessages_() {
  const messages = []
  for (const thread of GmailApp.search(QUERY, 0, 50)) messages.push(...thread.getMessages())
  return messages
}

function parseTicket_(message) {
  const html = message.getBody()
  const text = message.getPlainBody()

  const posterImg = findPosterImg_(html)
  let title = posterImg && posterImg.alt.replace(/\s*poster$/i, '').trim()
  if (!title) {
    const m = text.match(/^\s*(.+?)\s+poster\s*$/im)
    title = m && m[1].trim()
  }

  const dateMatch = text.match(/Date and time\s*(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*,?\s+(\d{4})/i)
  const bookingMatch = text.match(/Booking number\s*(\d+)/i)
  if (!title || !dateMatch || !bookingMatch) return null

  const month = MONTHS[dateMatch[2].toLowerCase()]
  if (!month) return null
  const date = [dateMatch[3], pad_(month), pad_(dateMatch[1])].join('-')

  return { title: title, date: date, booking: bookingMatch[1], posterSrc: posterImg ? posterImg.src : null }
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

function callImport_(ticket, posterUrl) {
  supabaseFetch_('/rest/v1/rpc/import_major_ticket', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ p_name: ticket.title, p_date: ticket.date, p_booking: ticket.booking, p_poster_url: posterUrl }),
  })
}

function supabaseFetch_(path, options) {
  const { url, key } = config_()
  options.headers = Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, options.headers)
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
  // Emails older than 30 days drop out of QUERY, so a short history is enough.
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
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function pad_(n) {
  return String(n).padStart(2, '0')
}
