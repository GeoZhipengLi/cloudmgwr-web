import Papa from 'papaparse'

export async function inspectCsvFile(file) {
  if (!file) throw new Error('Choose a CSV file first.')
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('CloudMGWR Version 1 accepts CSV files only.')

  // Read only the first MiB for column discovery, so very large files do not need to be loaded into memory.
  const head = await file.slice(0, 1024 * 1024).text()
  const parsed = Papa.parse(head, {
    header: true,
    preview: 5,
    skipEmptyLines: true,
  })

  const fields = (parsed.meta?.fields || []).map((x) => String(x).trim()).filter(Boolean)
  if (!fields.length) throw new Error('No CSV header row could be detected.')
  if (new Set(fields).size !== fields.length) throw new Error('The CSV contains duplicate column names.')

  return {
    fields,
    previewRows: parsed.data || [],
    parseWarnings: (parsed.errors || []).slice(0, 3),
  }
}
