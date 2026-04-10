// Claude API helper — called from browser via Anthropic API
// VITE_CLAUDE_API_KEY must be set in Vercel env vars

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

async function callClaude(systemPrompt, userPrompt, maxTokens = 1500) {
  if (!API_KEY) throw new Error('VITE_CLAUDE_API_KEY 환경변수가 없습니다.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ─── Feature 1: AI Mapping Suggestions ───────────────────────────────────────
// Given source columns + N41 schema, suggest best mapping
export async function suggestMappings(moduleKey, sourceColumns, schema) {
  const n41Cols = Object.entries(schema).map(([col, def]) => ({
    col,
    desc: def.en || def.ko || col,
  }))

  const system = `You are an expert in fashion ERP data mapping. 
You map source file columns to N41 ERP import columns.
Respond ONLY with valid JSON, no markdown, no explanation.`

  const user = `Module: ${moduleKey}

Source file columns:
${sourceColumns.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

N41 target columns (col: description):
${n41Cols.map(({ col, desc }) => `- ${col}: ${desc}`).join('\n')}

Return a JSON object where keys are N41 column names and values are the best matching source column name (or "" if no good match).
Only include columns where you're confident in the match.
Example: {"style": "Style Number", "color": "Color Code", "orderDate": "Order Date"}`

  const text = await callClaude(system, user, 2000)

  // Parse JSON safely
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── Feature 2: AI Data Cleansing Suggestions ─────────────────────────────────
// Given sample data for a column, suggest transform rules
export async function suggestTransforms(colName, sampleValues, n41ColDesc) {
  const system = `You are an expert in data cleansing for fashion ERP imports.
Suggest transform rules for a specific column based on sample data.
Respond ONLY with valid JSON, no markdown, no explanation.`

  const user = `Column to clean: "${colName}" (N41 field: ${n41ColDesc})

Sample values from source file:
${sampleValues.slice(0, 10).map((v, i) => `${i + 1}. ${JSON.stringify(String(v))}`).join('\n')}

Available transform rules:
- strip_special: remove non-alphanumeric chars except space/dash/underscore
- strip_all_special: remove ALL non-alphanumeric
- no_space: remove all spaces
- alphanumeric: keep only letters, numbers, spaces
- upper / lower / title: case conversion
- truncate:N: keep only first N characters (e.g. truncate:20)
- replace:old|new: replace text
- date:MM/DD/YYYY: format dates
- map:A=X,B=Y: value mapping
- prefix:XXX / suffix:XXX: add prefix or suffix
- Pipe-chain multiple: e.g. "strip_special | upper | truncate:20"

Return JSON: {
  "suggested_tf": "the transform rule string",
  "reason": "brief explanation in Korean",
  "preview": ["transformed value 1", "transformed value 2", "transformed value 3"]
}`

  const text = await callClaude(system, user, 1000)
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── Feature 3: Bulk cleanse suggestions for all active columns ───────────────
export async function suggestAllTransforms(mapping, sourceColumns, sampleRow) {
  const activeCols = Object.entries(mapping)
    .filter(([, v]) => v?.src && !v.src.startsWith('__') && sourceColumns.includes(v.src))
    .map(([n41Col, v]) => ({
      n41Col,
      srcCol: v.src,
      currentTf: v.tf || '',
      sampleVal: String(sampleRow?.[v.src] ?? ''),
    }))

  if (!activeCols.length) throw new Error('매핑된 컬럼이 없습니다.')

  const system = `You are an expert in data cleansing for fashion ERP imports.
Analyze all mapped columns and suggest necessary transform rules.
Respond ONLY with valid JSON array, no markdown, no explanation.`

  const user = `Mapped columns with sample values:
${activeCols.map(c => `- N41:"${c.n41Col}" ← Source:"${c.srcCol}" | sample: ${JSON.stringify(c.sampleVal)} | current_tf: "${c.currentTf}"`).join('\n')}

For each column that needs cleaning, suggest a transform rule.
Focus on:
1. Special characters that should be removed
2. Values exceeding 20 characters (suggest truncate:20)
3. Date format standardization
4. Case inconsistencies
5. Extra whitespace

Return JSON array:
[
  {
    "n41Col": "column name",
    "suggested_tf": "transform rule",
    "reason": "Korean explanation",
    "priority": "high|medium|low"
  }
]
Only include columns that actually need transformation. Skip columns that look clean.`

  const text = await callClaude(system, user, 2000)
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── Feature 4: Natural language cleanse command ──────────────────────────────
// e.g. "address 컬럼 special character 지워줘"
export async function processCleanseCommand(userMessage, mapping, sourceColumns, sampleRow) {
  const activeCols = Object.entries(mapping)
    .filter(([, v]) => v?.src && !v.src.startsWith('__'))
    .map(([n41Col, v]) => ({
      n41Col,
      srcCol: v.src,
      currentTf: v.tf || '',
      sampleVal: String(sampleRow?.[v.src] ?? ''),
    }))

  const system = `You are a data transformation assistant for a fashion ERP import tool.
The user will describe what transformation they want applied to specific columns.
Available transform rules:
- strip_special: remove non-alphanumeric except space/dash/underscore
- strip_all_special: remove ALL non-alphanumeric
- no_space: remove all spaces
- alphanumeric: keep only letters, numbers, spaces
- upper / lower / title
- truncate:N (e.g. truncate:20)
- replace:old|new
- date:MM/DD/YYYY
- map:A=X,B=Y
- prefix:XXX / suffix:XXX
- Pipe-chain: e.g. "strip_special | upper | truncate:20"

Respond ONLY with valid JSON array, no markdown, no explanation.`

  const user = `User request: "${userMessage}"

Available mapped columns with sample values:
${activeCols.map(c => `- N41:"${c.n41Col}" src:"${c.srcCol}" sample:${JSON.stringify(c.sampleVal)} current_tf:"${c.currentTf}"`).join('\n')}

Based on the user's request, return JSON array of columns to update:
[
  {
    "n41Col": "exact column name from the list above",
    "suggested_tf": "transform rule string",
    "reason": "Korean explanation of what this does"
  }
]
Only include columns that match the user's request. If user says 'all columns', apply to all relevant ones.`

  const text = await callClaude(system, user, 1500)
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── Feature 5: Sync AI command (natural language column mapping/transform) ──
// e.g. "FashionGo seller ID를 N41 style#로 바꿔줘"
export async function processSyncCommand(userMessage, platform, platColumns, n41SampleRow, platSampleRow) {
  const system = `You are a data sync assistant for fashion platform files (FashionGo, Shopify) and N41 ERP.
The user will describe a column mapping or data transformation they want applied to the platform file.
You analyze the user's request and return which columns to update and how.

Respond ONLY with valid JSON, no markdown, no explanation.`

  const user = `Platform: ${platform}
User request: "${userMessage}"

Platform file columns: ${JSON.stringify(platColumns)}
Platform file sample row: ${JSON.stringify(platSampleRow)}
N41 sample data: ${JSON.stringify(n41SampleRow)}

Based on the user's request, return JSON:
{
  "understanding": "Korean: what you understood the user wants",
  "changes": [
    {
      "platCol": "exact platform column name to update",
      "sourceType": "n41_field | transform | fixed",
      "n41Field": "n41 field name if sourceType=n41_field (style/color/sizeCat/bundle/price1/descript etc)",
      "transform": "optional transform rule (strip_special | truncate:20 | upper etc)",
      "fixedValue": "if sourceType=fixed, the value to set",
      "description": "Korean: what this change does"
    }
  ],
  "previewNote": "Korean: any important notes about this change"
}`

  const text = await callClaude(system, user, 1500)
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}
