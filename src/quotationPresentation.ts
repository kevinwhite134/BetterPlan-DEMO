import type { QuotationDetails } from './quotationDetails.ts'
import type { QuotationEstimate } from './quotationEstimate.ts'
import { designReference } from './installerPlan.ts'
import type { Settings } from './planner.ts'

const money = new Intl.NumberFormat('en-IE', {style:'currency',currency:'EUR'})
const rate = new Intl.NumberFormat('en-IE', {style:'currency',currency:'EUR',maximumFractionDigits:4})
const date = new Intl.DateTimeFormat('en-IE', {day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Dublin'})

export const quoteMoney = (cents:number|null) => cents===null?'Pending':money.format(cents/100)
export const quoteRate = (value:number|null) => value===null?'Pending':rate.format(value)
export const QUOTE_COLUMNS = ['Quantity','Details','Unit price','Net amount'] as const
export const quoteReference = (s:Settings) => s.quotation?.quotationNumber?.trim()||s.quotation?.projectReference?.trim()||designReference(s)

export function quotationReferences(q:QuotationDetails,reference:string,now:Date){
  const expiry=q.validUntil?Date.parse(`${q.validUntil}T12:00:00Z`):NaN
  const rows = [
    ['Quotation no.',reference],
    ['Date',date.format(now)],
    ['Customer order no.',q.customerOrderNumber],
    ['Account no.',q.accountNumber],
    ['Project reference',q.projectReference===reference?undefined:q.projectReference],
    ['Revision',q.revision],
    ['Valid until',Number.isFinite(expiry)?date.format(expiry):undefined],
  ] as const
  return rows.flatMap(([label,value])=>value?.trim()?[[label,value.trim().replace(/\s+/g,' ')] as const]:[])
}

export function quotationAddresses(q:QuotationDetails){
  const billing = [q.customerName,q.customerAddress,q.customerEircode].filter(value=>value?.trim()).join('\n')
  const site = q.siteAddress?.trim()
  return [billing,site&&site!==q.customerAddress?.trim()?`Site address\n${site}`:''].filter(Boolean).join('\n\n')
}

export function quotationPriceGroups(estimate:QuotationEstimate){
  if(estimate.sections.length===1)return [{id:'all',name:'',lines:estimate.lines}]
  return [...estimate.sections,{id:'extras',name:'Extras'}].map(({id,name})=>({id,name,lines:estimate.lines.filter(line=>line.sectionId===id)})).filter(group=>group.lines.length)
}

export function quotationPriceTotals(estimate:QuotationEstimate,q:QuotationDetails){
  return [
    {label:estimate.complete?'Net amount':'Priced subtotal',cents:estimate.subtotalCents},
    {label:q.fulfilment==='collection'?'Collection':'Delivery net',cents:estimate.deliveryCents},
    {label:estimate.vatRate===null?'VAT (rate required)':`VAT @ ${estimate.vatRate}%`,cents:estimate.vatCents},
    {label:'Quotation total',cents:estimate.totalCents},
  ]
}
