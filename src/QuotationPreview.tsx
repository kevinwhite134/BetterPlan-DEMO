import { useMemo, useState } from 'react'
import type { Plan, Settings } from './planner'
import type { QuotationEstimate } from './quotationEstimate'
import { QUOTATION_VIEWS } from './quotationDetails'
import { deckPreviewSvg, deckPreviewUrl, subframePreviewSvg } from './deckPreview'
import { QUOTE_COLUMNS, quotationAddresses, quotationPriceGroups, quotationPriceTotals, quotationReferences, quoteMoney, quoteRate, quoteReference } from './quotationPresentation'

function DeckViews({plan,settings,angle,name}:{plan:Plan;settings:Settings;angle:number;name:string}){
  const designKey=JSON.stringify({...settings,quotation:undefined})
  const [deck,subframe]=useMemo(()=>{
    const design:Settings=JSON.parse(designKey)
    return [deckPreviewSvg(plan,design,angle),subframePreviewSvg(plan,design,angle)].map(deckPreviewUrl)
  },[plan,designKey,angle])
  return <section className="quote-paper-views">
    {name?<h4>{name}</h4>:null}
    <figure><figcaption>Deck</figcaption><img src={deck} alt="3D view of the finished deck"/></figure>
    <figure><figcaption>Subframe</figcaption><img src={subframe} alt="3D view of the deck subframe and supports"/></figure>
  </section>
}

export default function QuotationPreview({quote,settings,onChange}:{quote:QuotationEstimate;settings:Settings;onChange:(s:Settings)=>void}){
  const [date]=useState(()=>new Date())
  const q=settings.quotation??{}
  const view=QUOTATION_VIEWS.find(v=>v.value===q.view)??QUOTATION_VIEWS[0]
  const addresses=quotationAddresses(q)
  return <>
    <article className="quote-paper" aria-label="Quotation">
      <header className="quote-paper-masthead">
        <img src="/betterdeck-logo.jpg" alt="BetterDeck"/>
        {addresses?<p>{addresses}</p>:null}
        <div>
          <h3>Quotation</h3>
          <dl>{quotationReferences(q,quoteReference(settings),date).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </header>
      <table className="quote-paper-prices" aria-label="Quoted items">
        <thead><tr>{QUOTE_COLUMNS.map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
        {quotationPriceGroups(quote).map(group=><tbody key={group.id}>
          {group.name?<tr><th scope="rowgroup" colSpan={4}>{group.name}</th></tr>:null}
          {group.lines.map(line=><tr key={line.key}>
            <td>{line.pending?'Pending':`${line.qty} ${line.unit}`}</td>
            <td>{line.name}</td>
            <td>{quoteRate(line.rate)}</td>
            <td>{quoteMoney(line.cents)}</td>
          </tr>)}
        </tbody>)}
      </table>
      <dl className="quote-paper-total">{quotationPriceTotals(quote,q).map(row=><div key={row.label}><dt>{row.label}</dt><dd>{quoteMoney(row.cents)}</dd></div>)}</dl>
      {quote.sections.map(section=><DeckViews key={section.id} plan={section.plan} settings={section.settings} angle={view.angle} name={quote.sections.length>1?section.name:''}/>)}
    </article>
    <div className="quote-camera-control">
      <label htmlFor="quotation-camera">3D view angle</label>
      <select id="quotation-camera" value={view.value} onChange={e=>onChange({...settings,quotation:{...q,view:e.target.value as typeof view.value}})}>
        {QUOTATION_VIEWS.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
      </select>
    </div>
  </>
}
