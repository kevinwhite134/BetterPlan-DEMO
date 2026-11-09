import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib'
import type { PDFPage } from 'pdf-lib'
import { pdfBrand } from './pdfBrand.ts'

export const MM=72/25.4
export const QUOTE_COLOURS={green:rgb(.16,.26,.21),ink:rgb(.1,.12,.1),muted:rgb(.32,.36,.31),pale:rgb(.97,.98,.955),line:rgb(.84,.87,.81),white:rgb(1,1,1),accent:rgb(.46,.53,.34)}
const quoteSafe=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[^\x20-\x7e\n€®™²×°±·]/g,' ')

export async function quotationDocument(doc:PDFDocument,reference:string,logo?:Uint8Array){
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold)
  const brand=await pdfBrand(doc,logo,{height:25,left:16,top:9}),c=QUOTE_COLOURS
  let page:PDFPage,y=0
  const text=(value:string,x:number,top:number,size=3,strong=false,colour=c.ink,right=false)=>{
    const clean=quoteSafe(value).replaceAll('\n',' '),face=strong?bold:font,width=face.widthOfTextAtSize(clean,size*MM)/MM
    page.drawText(clean,{x:(right?x-width:x)*MM,y:page.getHeight()-top*MM,size:size*MM,font:face,color:colour})
  }
  const rect=(x:number,top:number,width:number,height:number,colour=c.pale)=>page.drawRectangle({x:x*MM,y:page.getHeight()-(top+height)*MM,width:width*MM,height:height*MM,color:colour})
  const rule=(top:number,x=16,width=178,colour=c.line,thickness=.2)=>page.drawLine({start:{x:x*MM,y:page.getHeight()-top*MM},end:{x:(x+width)*MM,y:page.getHeight()-top*MM},color:colour,thickness:thickness*MM})
  const fittedText=(value:string,x:number,top:number,width:number,size=3,strong=false,colour=c.ink,right=false)=>{
    const face=strong?bold:font,measured=face.widthOfTextAtSize(quoteSafe(value).replaceAll('\n',' '),size*MM)/MM
    text(value,x,top,Math.min(size,size*width/Math.max(measured,.01)),strong,colour,right)
  }
  const wrap=(value:string,width=178,size=3,strong=false)=>{
    const result:string[]=[],face=strong?bold:font
    for(const raw of quoteSafe(value).split('\n')){
      let line=''
      for(const char of raw){if(line&&face.widthOfTextAtSize(line+char,size*MM)>width*MM){const space=line.lastIndexOf(' ');if(space>line.length*.45){result.push(line.slice(0,space));line=line.slice(space+1)+char}else{result.push(line);line=char}}else line+=char}
      result.push(line)
    }
    return result
  }
  const next=()=>{
    const continued=doc.getPageCount()>0
    page=doc.addPage([210*MM,297*MM]);brand(page)
    text(continued?'Quotation (continued)':'Quotation',113,19,continued?5:6,true)
    if(continued)fittedText(reference,113,26,81,3)
    y=39
  }
  const ensure=(height:number)=>{if(y+height>273)next()}
  const paragraph=(value:string,size=3,strong=false,colour=c.ink)=>{
    for(const line of wrap(value,178,size,strong)){ensure(size*1.6);text(line,16,y,size,strong,colour);y+=size*1.6}y+=3
  }
  const heading=(value:string)=>{ensure(13);y+=2;paragraph(value,3,true)}
  const imageRow=async(images:{label:string;bytes:Uint8Array}[],sectionName:string)=>{
    const gap=6,width=(178-gap)/2,height=width*400/720
    const titleLines=sectionName?wrap(sectionName,178,3,true):[]
    ensure(titleLines.length*4.5+height+15)
    y+=3
    for(const line of titleLines){text(line,16,y+3,3,true);y+=4.5}
    for(const [i,{label,bytes}] of images.entries()){
      const img=await doc.embedPng(bytes),scale=Math.min(width/img.width,height/img.height),w=img.width*scale,h=img.height*scale
      const x=16+i*(width+gap)
      text(label,x,y+4,2.8,true)
      page.drawImage(img,{x:(x+(width-w)/2)*MM,y:page.getHeight()-(y+6+(height+h)/2)*MM,width:w*MM,height:h*MM})
    }
    y+=height+14
  }
  const link=(label:string,url:string,x:number,top:number,width:number,height:number)=>{
    text(label,x,top,3,true,c.green)
    page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x*MM,page.getHeight()-(top+height)*MM,(x+width)*MM,page.getHeight()-(top-4)*MM],Border:[0,0,0],A:{Type:'Action',S:PDFName.of('URI'),URI:PDFString.of(url)}})))
  }
  const footer=()=>{
    const count=doc.getPageCount()
    doc.getPages().forEach((p,i)=>{
      page=p;const width=p.getWidth()/MM,height=p.getHeight()/MM
      rect(0,height-19,width,19,c.white);rule(height-18,16,width-32)
      text('BetterDeck®',16,height-12,2.4,true,c.green)
      text('+353 49 437-2667 · info@betterdeck.ie',width/2,height-12,2.2,false,c.muted)
      text('The Links Business Park, Golf Links Road, Cavan, Co. Cavan H12 CT98',16,height-6,1.9,false,c.muted)
      text(`${String(i+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`,width-16,height-6,2.2,false,c.muted,true)
    })
  }
  return {text,fittedText,rect,rule,wrap,next,ensure,paragraph,heading,imageRow,link,footer,get page(){return page},get y(){return y},set y(value:number){y=value}}
}
