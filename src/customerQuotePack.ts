import { PDFDocument } from 'pdf-lib'
import type { Plan, Settings } from './planner.ts'
import { renderQuotation } from './quotationPdf.ts'
import type { QuotationPdfOptions } from './quotationPdf.ts'
import { exportInstallerPdf } from './installerPdf.ts'
import { quotationSections } from './quotationSections.ts'

export type CustomerQuotePackOptions=QuotationPdfOptions&{includeInstaller?:boolean}

export async function exportCustomerQuotePack(plan:Plan,s:Settings,prices:Record<string,string>,options:CustomerQuotePackOptions={}){
  const {doc,footer}=await renderQuotation(plan,s,prices,options)
  if(options.includeInstaller){
    for(const section of quotationSections(plan,s,prices)){
      if(!section.plan.frame.geometryPass)throw new Error('Resolve support geometry before adding installer schedules.')
      const installer=await PDFDocument.load(await exportInstallerPdf(section.plan,section.settings,{logo:options.logo,now:options.now,includeReferences:false}))
      for(const page of await doc.copyPages(installer,installer.getPageIndices()))doc.addPage(page)
    }
  }
  footer()
  return doc.save()
}
