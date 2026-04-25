// Claude API helper — called from browser via Anthropic API
// VITE_CLAUDE_API_KEY must be set in Vercel env vars


// ─── N41 ERP Domain Knowledge ─────────────────────────────────────────────────
const N41_ERP_CONTEXT = `
## N41 ERP System - Fashion Industry

### Modules & Templates
- **Sales Order (SO)**: Customer orders received. Cloud cols: index, orderNo, orderDate, startDate, customer, type, shipTo, billTo, division, po, releaseNo, shipVia, term, memo, houseMemo, bulkOrder, box, currency, orderDecision, discountRate, memoCode, voids, line, style, color, warehouse, cancelDate, status, sizeCategory, size, quantity, price, memoDet, userName, userTime, cancelReason, season, promotion, salesRep1, comRate1, salesRep2, comRate2, tradeShow, bundle, numOfBundle, checkSkip
- **Purchase Order (PO)**: Orders sent to vendors. Cols: poNo, cutPo, processType, orderDate, startDate, cancelDate, etaDate, shipDate, vendor, division, warehouse, status, shipVia, line, style, color, unit1~unit15, unitSum, price
- **Style**: Product master. Key cols: style, color, status, descript, division, sizeCat, bundle, price1~price5, cost, cost1~cost3, season, category, subCategory, fabricType, coo, vendor1
- **Customer**: Customer master. Key cols: code, name, addr1, addr2, city, state, zip, country, phone1, phone2, email1, email2, term, shipVia, status, division, priceLevel, paymentCode, salesRep1, salesRep1Rate
- **Inventory**: Stock levels. Cols: style, color, warehouse, unit1~unit15 (per size quantities)

### Key Field Definitions
- **orderNo / soNo**: Sales Order number (unique identifier per SO)
- **poNo**: Purchase Order number sent to vendor
- **style**: Style/product number (e.g. CD1024)
- **color**: Color description (e.g. BLACK IVORY)
- **size**: Individual size (e.g. XS, S, M, L, XL)
- **sizeCategory / sizeCat**: Size run category (e.g. SML, SMLXL, SMLXL2X, NUMERIC)
- **unit1~unit15**: Quantity per size slot in PO/Inventory (unit1=first size of sizeCat, e.g. if SML then unit1=S, unit2=M, unit3=L)
- **unitSum**: Total of unit1~unit15
- **quantity**: Quantity per line in SO
- **price**: Unit price (cost to customer for SO, cost to company for PO)
- **price1**: Retail/wholesale price 1 in Style master
- **cost**: Base cost in Style master
- **bundle**: Units per prepack bundle (e.g. 6 = 6pcs per pack)
- **numOfBundle**: Number of bundles
- **division**: Business division/brand segment
- **warehouse**: Warehouse code (e.g. LA, NY)
- **season**: Season code (e.g. SS2026, FW2026)
- **po**: Customer's PO number on SO (different from poNo which is vendor PO)
- **line**: Line number within an order
- **shipTo / billTo**: Ship-to and bill-to address codes
- **term**: Payment terms (e.g. NET 30, NET 60)
- **shipVia**: Shipping method (e.g. ROUTING GUIDE, UPS, FEDEX)
- **status**: Record status (e.g. N=New, H=Hold, C=Cancel)
- **salesRep1/2**: Sales representative codes
- **comRate1/2**: Commission rates for sales reps
- **cancelDate**: Last date to ship order
- **startDate**: Ship window start date
- **memo / houseMemo**: Internal notes
- **total price**: Calculated as price * quantity (not a stored field)
- **coo**: Country of Origin
- **fabricType**: Fabric type/content
- **descript**: Style description

### Size Categories & unit mapping
- SML: unit1=S, unit2=M, unit3=L
- SMLXL: unit1=S, unit2=M, unit3=L, unit4=XL
- SMLXL2X: unit1=S, unit2=M, unit3=L, unit4=XL, unit5=2X
- NUMERIC (0-14): unit1=0, unit2=2, unit3=4, unit4=6, unit5=8, unit6=10, unit7=12, unit8=14
- XS-XL: unit1=XS, unit2=S, unit3=M, unit4=L, unit5=XL
- ONE SIZE: unit1 only

### Common Operations
- Moving qty between units: shift unit values (e.g. unit2→unit1 means first size moves to next position)
- Sequential poNo: start from a base number, increment by 1 per row
- total price calculation: price * quantity
- sizeCat expansion: SML → S, M, L as separate rows
`

// ERP_GLOSSARY is imported from erp_glossary.js (auto-generated from n41_glossary.xlsx)
import { ERP_GLOSSARY } from './erp_glossary'

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

async function callClaude(systemPrompt, userPrompt, maxTokens = 1500) {
  if (!API_KEY) throw new Error('VITE_CLAUDE_API_KEY 환경변수가 없습니다.')

  const finalSystem = ERP_GLOSSARY + '\n\n' + systemPrompt

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
      system: finalSystem,
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
  // Uses ERP context automatically
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

// ─── Feature 6: PDF PO Parser ─────────────────────────────────────────────────
// Extracts structured data from vendor PO PDFs using Claude Vision

export async function parsePOPdf(pdfFile) {
  if (!API_KEY) throw new Error('VITE_CLAUDE_API_KEY 환경변수가 없습니다.')

  // Convert PDF to base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(pdfFile)
  })

  const system = `You are an expert at extracting structured data from Purchase Order PDFs.
Extract all data and return ONLY valid JSON, no markdown, no explanation.`

  const user = `Extract all data from this Purchase Order PDF and return JSON in this exact format:
{
  "header": {
    "poNo": "PO number",
    "orderDate": "date string as-is",
    "shipDate": "date string as-is",
    "cancelDate": "date string as-is",
    "paymentTerms": "payment terms",
    "currency": "currency code",
    "shipVia": "shipping method",
    "customer": "buyer company name",
    "shipTo": {
      "name": "",
      "address": "",
      "city": "",
      "state": "",
      "zip": "",
      "country": ""
    },
    "billTo": {
      "name": "",
      "address": "",
      "city": "",
      "state": "",
      "zip": "",
      "country": ""
    }
  },
  "lines": [
    {
      "lineNo": 1,
      "packType": "",
      "vendorStyle": "",
      "color": "",
      "size": "",
      "qty": 0,
      "unitCost": 0,
      "unitRetail": 0
    }
  ]
}`

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
      max_tokens: 2000,
      system,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          { type: 'text', text: user }
        ]
      }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답을 파싱할 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── Convert PO PDF data → N41 SO rows ───────────────────────────────────────
export function convertPOToSORows(parsed) {
  const { header, lines } = parsed
  if (!lines?.length) throw new Error('라인 데이터가 없습니다.')

  // Format date: "December 16, 2025" → "12/16/2025"
  function fmtDate(str) {
    if (!str) return ''
    // Already MM/DD/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str
    const d = new Date(str)
    if (!isNaN(d)) {
      return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
    }
    return str
  }

  // Build shipTo / billTo strings
  function fmtAddr(addr) {
    if (!addr) return ''
    return [addr.name, addr.address, addr.city, addr.state, addr.zip, addr.country]
      .filter(Boolean).join(', ')
  }

  const orderNo = header.poNo?.replace(/^0+/, '') || ''  // strip leading zeros

  return lines.map((line, i) => ({
    index:      i + 1,
    orderNo,
    orderDate:  fmtDate(header.orderDate),
    startDate:  fmtDate(header.shipDate),
    cancelDate: fmtDate(header.cancelDate),
    customer:   '',   // user fills in from mapping
    type:       '',
    shipTo:     fmtAddr(header.shipTo),
    billTo:     fmtAddr(header.billTo),
    division:   '',
    po:         header.poNo || '',
    releaseNo:  '',
    shipVia:    header.shipVia || '',
    term:       header.paymentTerms || '',
    memo:       '',
    houseMemo:  '',
    bulkOrder:  '',
    box:        '',
    currency:   header.currency || 'USD',
    orderDecision: '',
    discountRate: '',
    memoCode:   '',
    voids:      '',
    updateUser: '',
    updateTime: '',
    routingGuide: '',
    priceLevel: '',
    shipToStore: '',
    dc:         '',
    paymentCode: '',
    freight:    '',
    misc:       '',
    taxable1:   '',
    taxable2:   '',
    line:       line.lineNo || (i + 1),
    style:      line.vendorStyle || '',
    color:      line.color || '',
    warehouse:  '',
    cancelDate2: fmtDate(header.cancelDate),
    status:     '',
    sizeCategory: '',
    size:       line.size || '',
    quantity:   line.qty || '',
    price:      line.unitCost || '',
    memoDet:    '',
    userName:   '',
    userTime:   '',
    cancelReason: '',
    season:     '',
    promotion:  '',
    salesRep1:  '',
    comRate1:   '',
    salesRep2:  '',
    comRate2:   '',
    tradeShow:  '',
    bundle:     line.packType === 'LOOSE' ? '' : line.packType || '',
    numOfBundle: '',
    checkSkip:  '',
  }))
}

// ─── Feature 7: Row Transform Code Generator ─────────────────────────────────
// Natural language → JavaScript row transform function
// e.g. "14~16번 줄 unit2를 unit1으로 옮겨줘"
export async function generateRowTransform(userMessage, columns, sampleRows) {
  const system = `You are a data transformation code generator for a fashion ERP system.
The user will describe a data transformation in natural language.
You must return ONLY a valid JavaScript arrow function that transforms a single row.

Function signature: (row, index) => newRow
- row: object with column keys
- index: 0-based row index
- return: transformed row object (always return the full row)

Rules:
- Always spread the original row: { ...row, ... }
- Use 0-based index for row number checks (row 1 = index 0)
- For sequential values, use index to calculate
- Never use external libraries
- Return ONLY the arrow function code, no explanation, no markdown`

  const user = `User request: "${userMessage}"

Available columns: ${JSON.stringify(columns)}

Sample data (first 3 rows):
${sampleRows.slice(0,3).map((r,i) => `Row ${i+1}: ${JSON.stringify(r)}`).join('\n')}

Return ONLY the JavaScript arrow function. Example format:
(row, index) => {
  if (index >= 13 && index <= 15) {
    return { ...row, unit1: row.unit2, unit2: row.unit3 }
  }
  return row
}`

  const text = await callClaude(system, user, 1000)
  // Extract function from response
  const cleaned = text.replace(/\`\`\`javascript|\`\`\`js|\`\`\`/g, '').trim()
  // Validate it starts with arrow function
  if (!cleaned.includes('=>')) throw new Error('Invalid function generated')
  return cleaned
}
