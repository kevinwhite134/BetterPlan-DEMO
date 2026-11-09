import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { Plan, Settings } from './planner'
import type { SavedProject } from './projectLibrary'
import { quotationDetailsError } from './quotationDetails'
import { quotationEstimate } from './quotationEstimate'
import QuotationSettings from './QuotationSettings'
import QuotationPreview from './QuotationPreview'
import ReviewFiles from './ReviewFiles'
import InstallerPlanDownload from './InstallerPlanDownload'
import './Quotation.css'

const STEPS=[{id:'customer',name:'Customer'},{id:'project',name:'Project'},{id:'pricing',name:'Pricing'},{id:'preview',name:'Preview'}] as const
export type QuoteStep=typeof STEPS[number]['id']
type Props={plan:Plan|null;settings:Settings;prices:Record<string,string>;projects?:SavedProject[];currentId?:string;initialStep?:QuoteStep;pending:boolean;onChange:(s:Settings)=>void;onDownload:(name:string,data:string|ArrayBuffer,type?:string)=>void;pricing:ReactNode;checks:ReactNode}

export default function QuotationWorkspace(p:Props){
  const [step,setStep]=useState<QuoteStep>(p.initialStep??'customer'),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [pdf,setPdf]=useState<{key:string;url:string}|null>(null),[showPdf,setShowPdf]=useState(false)
  const panel=useRef<HTMLElement>(null),alive=useRef(true),q=p.settings.quotation??{},index=STEPS.findIndex(s=>s.id===step)
  const key=useMemo(()=>JSON.stringify([p.settings,p.prices]),[p.settings,p.prices]),validation=quotationDetailsError(q)
  const quote=useMemo(()=>p.plan?quotationEstimate(p.plan,p.settings,p.prices):null,[p.plan,p.settings,p.prices])
  const canExport=!!p.plan&&!p.pending&&!validation,currentPdf=pdf?.key===key?pdf.url:null
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false}},[])
  useEffect(()=>()=>{if(pdf)URL.revokeObjectURL(pdf.url)},[pdf])
  const go=(next:QuoteStep)=>{setStep(next);setShowPdf(false);requestAnimationFrame(()=>{panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'start',behavior:'auto'})})}
  const exportPdf=async(preview:boolean)=>{
    if(!p.plan||!canExport||busy)return
    setBusy(true);setError('')
    try{
      const {createQuotationDownload}=await import('./quotationExport')
      const bytes=await createQuotationDownload(p.plan,p.settings,p.prices)
      if(!alive.current)return
      if(preview){setPdf({key,url:URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer],{type:'application/pdf'}))});setShowPdf(true);setStep('preview')}
      else p.onDownload('betterdeck-quotation.pdf',Uint8Array.from(bytes).buffer,'application/pdf')
    }catch{if(alive.current)setError('We couldn’t create the PDF. Please try again.')}
    finally{if(alive.current)setBusy(false)}
  }
  const tabKeys=(event:KeyboardEvent<HTMLButtonElement>,i:number)=>{
    const next=event.key==='ArrowRight'?(i+1)%4:event.key==='ArrowLeft'?(i+3)%4:event.key==='Home'?0:event.key==='End'?3:-1
    if(next<0)return;event.preventDefault();setStep(STEPS[next].id);setShowPdf(false)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
  const completed=[!!q.customerName?.trim(),!!p.plan,!!quote?.complete&&quote.vatRate!==null,false]
  return <main className="quotation-studio" aria-label="Quotation">
    <header className="quote-studio-header">
      <h1>Quotation</h1>
      <div className="quote-studio-actions">
        <InstallerPlanDownload plan={p.plan} settings={p.settings} pending={p.pending}/>
        <button type="button" className="button secondary" disabled={!canExport||busy} onClick={()=>exportPdf(true)}>{busy?'Preparing PDF…':'Preview PDF'}</button>
        <button type="button" className="button secondary" disabled={!canExport||busy} onClick={()=>exportPdf(false)}>Download Quotation</button>
      </div>
    </header>
    <nav className="quote-stepper" role="tablist" aria-label="Quotation sections">{STEPS.map((s,i)=><button type="button" role="tab" aria-label={s.name} id={`quote-tab-${s.id}`} aria-selected={step===s.id} aria-controls={`quote-panel-${s.id}`} tabIndex={step===s.id?0:-1} key={s.id} onClick={()=>go(s.id)} onKeyDown={e=>tabKeys(e,i)}><span className={completed[i]?'is-complete':''} aria-hidden="true">{completed[i]?'✓':i+1}</span><b>{s.name}</b></button>)}</nav>
    {error?<p className="quote-inline-error" role="alert">{error}</p>:null}
    {validation?<p className="quote-inline-error" role="alert">{validation}</p>:null}
    <div className={`quote-studio-body ${step==='preview'?'is-preview':''}`}>
      <section ref={panel} tabIndex={-1} role="tabpanel" id={`quote-panel-${step}`} aria-labelledby={`quote-tab-${step}`} className="quote-editor-panel">
        <QuotationSettings key={p.currentId} s={p.settings} onChange={p.onChange} projects={p.projects} currentId={p.currentId} step={step}/>
        {step==='pricing'?<><section className="quote-form-card quote-materials">{p.pricing}</section>{quote&&quote.sections.length>1?<section className="quote-form-card"><h4>Other deck sections</h4><p>Saved material rates are included in the total. Remove and add a section again to refresh its rates.</p>{quote.sections.slice(1).map(s=><div className="quote-section-cost" key={s.id}><strong>{s.name}</strong><span>{new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(quote.lines.filter(l=>l.sectionId===s.id).reduce((sum,l)=>sum+(l.cents??0),0)/100)} ex VAT</span></div>)}</section>:null}</>:null}
        <footer className="quote-editor-footer"><div>{index>0?<button type="button" className="button secondary" onClick={()=>go(STEPS[index-1].id)}>Back</button>:null}{index<3?<button type="button" className="button primary" onClick={()=>go(STEPS[index+1].id)}>Next</button>:null}</div></footer>
      </section>
      <aside className="quote-live-preview" aria-label="Quotation preview"><div className="quote-preview-toolbar"><strong>{showPdf&&currentPdf?'PDF preview':'Preview'}</strong>{showPdf&&currentPdf?<button type="button" className="text-button" onClick={()=>setShowPdf(false)}>Back to preview</button>:null}</div>
        {showPdf&&currentPdf?<div className="quote-pdf-frame"><iframe title="Quotation PDF" src={`${currentPdf}#toolbar=1&navpanes=0&view=FitH`}/><a href={currentPdf} target="_blank" rel="noreferrer">Open PDF in a new tab</a></div>:quote?<QuotationPreview quote={quote} settings={p.settings} onChange={p.onChange}/>:<p className="quote-preview-empty">{p.pending?'Preparing design…':'Resolve the design settings to preview the quotation.'}</p>}
        {quote&&!(showPdf&&currentPdf)&&(!quote.complete||quote.vatRate===null)?<div className="quote-readiness"><p>{!quote.complete?'Prices or quantities missing.':'VAT rate required.'}</p><button type="button" className="text-button" onClick={()=>go('pricing')}>Review pricing</button></div>:null}
      </aside>
    </div>
    {step==='preview'?<details className="quote-technical"><summary>CSV reports &amp; technical checks</summary><ReviewFiles plan={p.plan} settings={p.settings} prices={p.prices} pending={p.pending} onDownload={p.onDownload}/>{p.checks}</details>:null}
  </main>
}
