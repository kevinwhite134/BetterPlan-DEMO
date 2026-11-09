import qrcode from 'qrcode-generator'
import type { QuotationDetails } from './quotationDetails.ts'
import { installationLink } from './quotationDetails.ts'
import type { QuotationEstimate } from './quotationEstimate.ts'
import { QUOTE_COLOURS as c } from './quotationDocument.ts'
import type { quotationDocument } from './quotationDocument.ts'

export function quotationNotes(p:Awaited<ReturnType<typeof quotationDocument>>,q:QuotationDetails,estimate:QuotationEstimate){
  if(q.scope?.trim()){p.heading('Project scope');p.paragraph(q.scope)}
  if(q.inclusions?.trim()){p.heading('Included');p.paragraph(q.inclusions)}
  if(q.exclusions?.trim()){p.heading('Excluded');p.paragraph(q.exclusions)}
  if(q.terms?.trim()){p.heading('Payment & quotation terms');p.paragraph(q.terms)}
  if(q.notes?.trim()){p.heading('Notes');p.paragraph(q.notes,2.8)}
  if(q.acceptance?.trim()){p.heading('Acceptance');p.paragraph(q.acceptance,2.8)}
  p.paragraph('Provisional quotation. Installer to confirm quantities, dimensions, support capacities and connections before ordering. Pricing covers listed items only.',2.5,false,c.muted)
  for(const section of estimate.sections)if(section.settings.joistSpacing>400)p.paragraph(`${section.name} · Joist centres of ${section.settings.joistSpacing} mm require board supplier approval.`,2.6)
  const url=installationLink(q.installationUrl)
  if(url){
    const qr=qrcode(0,'M');qr.addData(url);qr.make();const count=qr.getModuleCount(),quiet=4,size=30,module=size/(count+quiet*2)
    p.ensure(40);p.y+=3;p.rect(16,p.y,size,size,c.white)
    for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))p.rect(16+(col+quiet)*module,p.y+(row+quiet)*module,module,module,c.ink)
    p.link('Installation guide',url,52,p.y+10,110,10)
    p.y+=36
  }
}
