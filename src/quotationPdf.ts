import { PDFDocument } from 'pdf-lib'
import type { Plan, Settings } from './planner.ts'
import { quotationEstimate } from './quotationEstimate.ts'
import { quotationNotes } from './quotationNotes.ts'
import { QUOTE_COLOURS as c, quotationDocument } from './quotationDocument.ts'
import { QUOTE_COLUMNS, quotationAddresses, quotationPriceGroups, quotationPriceTotals, quotationReferences, quoteMoney, quoteRate, quoteReference } from './quotationPresentation.ts'

export type QuotationPdfOptions={
  now?:Date
  logo?:Uint8Array
  sectionPreviews?:{id:string;deck:Uint8Array;subframe:Uint8Array}[]
}

export async function renderQuotation(plan:Plan,s:Settings,prices:Record<string,string>,options:QuotationPdfOptions){
  const doc=await PDFDocument.create(),now=options.now??new Date(),q=s.quotation??{}
  const reference=quoteReference(s),estimate=quotationEstimate(plan,s,prices)
  doc.setTitle(`BetterDeck® quotation ${reference}`)
  doc.setAuthor('BetterDeck')
  doc.setCreator('BetterPlan')
  doc.setCreationDate(now)
  doc.setModificationDate(now)

  const p=await quotationDocument(doc,reference,options.logo)
  p.next()
  const firstPage=p.page
  let metadataBottom=26
  for(const [label,value] of quotationReferences(q,reference,now)){
    const lines=p.wrap(value,46,2.8)
    p.rule(metadataBottom,113,81)
    p.text(label,114,metadataBottom+4,2.6,true)
    lines.forEach((line,i)=>p.text(line,147,metadataBottom+4+i*4,2.8))
    metadataBottom+=lines.length*4+2
  }
  p.rule(metadataBottom,113,81)
  const addresses=quotationAddresses(q)
  for(const line of p.wrap(addresses,91,2.9)){
    p.ensure(5)
    p.text(line,16,p.y,2.9)
    p.y+=4.2
  }
  if(p.page===firstPage)p.y=Math.max(p.y,metadataBottom+6)

  const tableHeader=()=>{
    p.rect(16,p.y,178,7,c.pale)
    p.rule(p.y,16,178,c.accent)
    p.rule(p.y+7,16,178,c.accent)
    QUOTE_COLUMNS.forEach((label,i)=>p.text(label,[18,44,163,192][i],p.y+4.7,2.7,true,c.ink,i>1))
    p.y+=7
  }
  p.ensure(25)
  tableHeader()
  for(const group of quotationPriceGroups(estimate)){
    const title=p.wrap(group.name,174,2.8,true)
    const groupHeight=group.name?title.length*4+2:0
    let showGroup=!!group.name
    for(const line of group.lines){
      const qty=p.wrap(line.pending?'Pending':`${line.qty} ${line.unit}`,24,2.65)
      const details=p.wrap(line.name,95,2.8)
      const height=Math.max(qty.length,details.length)*4+2
      if(p.y+height+(showGroup?groupHeight:0)>273){
        p.next()
        tableHeader()
        showGroup=!!group.name
      }
      if(showGroup){
        title.forEach((value,i)=>p.text(value,18,p.y+4.2+i*4,2.8,true,c.green))
        p.y+=groupHeight
        showGroup=false
      }
      qty.forEach((value,i)=>p.text(value,18,p.y+4.2+i*4,2.65))
      details.forEach((value,i)=>p.text(value,44,p.y+4.2+i*4,2.8))
      p.fittedText(quoteRate(line.rate),163,p.y+4.2,23,2.8,false,c.ink,true)
      p.fittedText(quoteMoney(line.cents),192,p.y+4.2,26,2.8,false,c.ink,true)
      p.y+=height
      p.rule(p.y)
    }
  }

  const totals=quotationPriceTotals(estimate,q)
  p.ensure(37)
  p.y+=5
  for(const [index,row] of totals.entries()){
    const last=index===totals.length-1
    p.rule(p.y,113,81,last?c.accent:c.line,last?.4:.2)
    p.text(row.label,114,p.y+4.7,2.9,last)
    p.fittedText(quoteMoney(row.cents),192,p.y+4.7,34,last?3.5:2.9,last,c.ink,true)
    p.y+=6.5
  }
  p.y+=3

  for(const section of estimate.sections){
    const images=options.sectionPreviews?.find(preview=>preview.id===section.id)
    if(images)await p.imageRow([
      {label:'Deck',bytes:images.deck},
      {label:'Subframe',bytes:images.subframe},
    ],estimate.sections.length>1?section.name:'')
  }
  quotationNotes(p,q,estimate)
  return {doc,footer:p.footer}
}

export async function exportQuotationPdf(plan:Plan,s:Settings,prices:Record<string,string>,options:QuotationPdfOptions={}){
  const {doc,footer}=await renderQuotation(plan,s,prices,options)
  footer()
  return doc.save()
}
