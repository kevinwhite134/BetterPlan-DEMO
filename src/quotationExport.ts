import { deckPreviewPng, deckPreviewSvg, subframePreviewSvg } from './deckPreview'
import { QUOTATION_VIEWS } from './quotationDetails'
import { quotationSections } from './quotationSections'
import type { Plan, Settings } from './planner'

export async function createQuotationDownload(plan:Plan,settings:Settings,prices:Record<string,string>){
  const angle=(QUOTATION_VIEWS.find(v=>v.value===settings.quotation?.view)??QUOTATION_VIEWS[0]).angle
  const png=async(svg:string)=>new Uint8Array(await (await fetch(await deckPreviewPng(svg))).arrayBuffer())
  const [{exportQuotationPdf},{loadBetterDeckLogo},sectionPreviews]=await Promise.all([
    import('./quotationPdf'),import('./pdfBrand'),
    Promise.all(quotationSections(plan,settings,prices).map(async section=>{
      const [deck,subframe]=await Promise.all([
        png(deckPreviewSvg(section.plan,section.settings,angle)),
        png(subframePreviewSvg(section.plan,section.settings,angle)),
      ])
      return {id:section.id,deck,subframe}
    })),
  ])
  return exportQuotationPdf(plan,settings,prices,{logo:await loadBetterDeckLogo(),sectionPreviews})
}
