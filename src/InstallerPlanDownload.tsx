import { useState } from 'react'
import type { Plan, Settings } from './planner'

export default function InstallerPlanDownload({plan,settings,pending}:{plan:Plan|null;settings:Settings;pending:boolean}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const unavailable=pending?'Preparing the current design…':!plan?.frame.geometryPass?'Resolve the support layout to download the installation plan.':''
  const download=async()=>{
    if(!plan?.frame.geometryPass||pending||busy)return
    setBusy(true);setError('')
    try{
      const [{exportInstallerPdf},{loadBetterDeckLogo}]=await Promise.all([import('./installerPdf'),import('./pdfBrand')])
      const logo=await loadBetterDeckLogo()
      const bytes=await exportInstallerPdf(plan,settings,{logo})
      const url=URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer],{type:'application/pdf'})),a=document.createElement('a')
      a.href=url;a.download='betterdeck-installer-plan.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch{setError('Could not create the PDF. Please try again.')}finally{setBusy(false)}
  }
  return <span className="installer-download">
    <button type="button" className="button primary" disabled={busy||!!unavailable} aria-busy={busy} onClick={download}>{busy?'Creating installation plan…':'Download Installation Plan'}</button>
    {unavailable?<small className="installer-download-note" role="status">{unavailable}</small>:null}
    {error?<span className="installer-download-error" role="alert">{error}</span>:null}
  </span>
}
