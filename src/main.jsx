import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './style.css';

const A='/assets/';
const trCarriers = {
  trendyol:{name:'TRENDYOL', logo:'trendyol logo.jpg', prefix:'73300321', len:17, tpl:6, defaultSender:'TRENDYOL'},
  hepsijet:{name:'HEPSİJET', logo:'Hepsijet(3).png', prefix:'6270', len:15, tpl:4, defaultSender:'Hepsiburada'},
  aras:{name:'ARAS KARGO', logo:'Aras-Kargo(3).jpg', prefix:'72600321', len:17, tpl:1, defaultSender:'Trendyol'},
  yurtici:{name:'YURTİÇİ KARGO', logo:'Yurtici Kargo(3).webp', prefix:'72500321', len:17, tpl:7, defaultSender:'Trendyol'},
  dhltr:{name:'DHL eCommerce', logo:'DHL(3).png', prefix:'72800321', len:17, tpl:2, defaultSender:'Trendyol'},
  mng:{name:'MNG KARGO', logo:'MNG Kargo logo.png', prefix:'72900321', len:17, tpl:2, defaultSender:'Trendyol'},
  surat:{name:'SÜRAT KARGO', logo:'Sürat Kargo(3).jpg', prefix:'72700321', len:17, tpl:5, defaultSender:'Trendyol'},
  kolay:{name:'KOLAY GELSİN', logo:'Kolay gelsin(3).png', prefix:'88800', len:17, tpl:3, defaultSender:'Trendyol'},
  bovo:{name:'BOVO KARGO', logo:'bovo(3).jfif', prefix:'BV009', len:15, tpl:3, defaultSender:'Trendyol'},
  birgunde:{name:'BİRGÜNDE KARGO', logo:'Birgundekargo(3).jpeg', prefix:'BK00', len:15, tpl:2, defaultSender:'Trendyol'},
  ups:{name:'UPS', logo:'UPS(3).png', prefix:'UP00120', len:15, tpl:3, defaultSender:'Trendyol'},
  sendeo:{name:'SENDEO KARGO', logo:'Sendeo(3).png', prefix:'SN00', len:15, tpl:1, defaultSender:'Trendyol'},
  ptt:{name:'PTT', logo:'PTT(3).jpg', prefix:'73400321', len:17, tpl:4, defaultSender:'Trendyol'},
  geliver:{name:'GELİVER KARGO', logo:'Geliver(3).png', prefix:'GV00', len:15, tpl:4, defaultSender:'Trendyol'}
};
const usCarriers = {
  dhl:{name:'DHL', logo:'DHL(3).png', prefix:'JD', len:18, tpl:'us1', defaultSender:'Amazon'},
  ups:{name:'UPS', logo:'UPS(3).png', prefix:'1Z', len:18, tpl:'us2', defaultSender:'Amazon'},
  fedex:{name:'FEDEX', logo:null, prefix:'96', len:15, tpl:'us3', defaultSender:'Amazon'},
  usps:{name:'USPS', logo:null, prefix:'94', len:22, tpl:'us4', defaultSender:'Amazon'}
};
const trAddresses=[
 'Beşyol mh. Eski Londra Asfaltı blv. 16/1, Küçükçekmece, İstanbul.',
 'Hadımköy Yassıören Mah., PTTAVM Binası, Dolunay Sok., No: 28/2, Arnavutköy, İstanbul.',
 'Redakte et'
];
const usAddresses=[
 'Hadımköy Yassıören Mah., PTTAVM Binası, Dolunay Sok., No: 28/2',
 'Edit manually'
];
const yesterday=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)};
function rnd(n){let s=''; for(let i=0;i<n;i++) s+=Math.floor(Math.random()*10); return s}
function nextTrack(c){const key='usedTracks_v3'; const used=JSON.parse(localStorage.getItem(key)||'[]'); let t=''; let tries=0; do{ const rest=c.len-c.prefix.length; t=c.prefix + rnd(Math.max(0,rest)); tries++; }while(used.includes(t)&&tries<1000); used.push(t); localStorage.setItem(key, JSON.stringify(used.slice(-5000))); return t;}
function niceDate(v){const d=new Date(v||yesterday()); return d.toLocaleDateString('tr-TR');}
function Barcode({value, className='', height=48}){ const ref=useRef(null); useEffect(()=>{if(ref.current) JsBarcode(ref.current, value, {format:'CODE128', displayValue:true, fontSize:13, height, width:1.42, margin:0, textMargin:3});},[value,height]); return <svg className={'barcode '+className} ref={ref}/> }
function QR({value}){ const [src,setSrc]=useState(''); useEffect(()=>{QRCode.toDataURL(value,{margin:0,width:112,errorCorrectionLevel:'M'}).then(setSrc)},[value]); return <img className="qr" src={src}/> }
function Logo({c, big=false}){return c.logo?<img className={big?'logo big':'logo'} src={A+c.logo}/>:<div className="noLogo"/>}
function App(){
 const [region,setRegion]=useState('TR'); const carriers=region==='TR'?trCarriers:usCarriers; const [carrier,setCarrier]=useState(Object.keys(carriers)[0]);
 useEffect(()=>{setCarrier(Object.keys(region==='TR'?trCarriers:usCarriers)[0])},[region]);
 const c=carriers[carrier];
 const [form,setForm]=useState({sender:'', recipient:'', customer:'', addressChoice:'0', manualAddress:'', date:'', kg:'', district:'', products:''});
 const [track,setTrack]=useState(()=>nextTrack(trCarriers.trendyol));
 useEffect(()=>{setTrack(nextTrack(c))},[carrier,region]);
 const data=useMemo(()=>{
  const sender=form.sender.trim()||c.defaultSender; const recipient=form.recipient.trim();
  const addrs=region==='TR'?trAddresses:usAddresses; let addr=form.addressChoice==='2'||(region==='US'&&form.addressChoice==='1')?form.manualAddress:addrs[Number(form.addressChoice)];
  const address=((form.customer.trim()?form.customer.trim()+' ':'')+(addr||'')).trim();
  return {sender, recipient, address, date:form.date||yesterday(), kg:form.kg||'1', district:(form.district||'KÜÇÜKÇEKMECE').toUpperCase(), products:form.products, track};
 },[form,c,region,track]);
 const update=(k,v)=>setForm({...form,[k]:v});
 const labelRef=useRef(null);
 async function exportPdf(){const node=labelRef.current; const canvas=await html2canvas(node,{scale:3, backgroundColor:'#fff'}); const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[100,100]}); pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,100,100); pdf.save(`${c.name}-${track}.pdf`)}
 return <>
  <div className="app"><aside className="panel">
   <h1>Kargo Etiketi Pro</h1><p className="muted">10×10 termal etiket, oxunaqlı barkod və QR generatoru.</p>
   <div className="seg"><button className={region==='TR'?'on':''} onClick={()=>setRegion('TR')}>Türkiye</button><button className={region==='US'?'on':''} onClick={()=>setRegion('US')}>America</button></div>
   <label>Kargo şirketi<select value={carrier} onChange={e=>setCarrier(e.target.value)}>{Object.entries(carriers).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></label>
   <label>{region==='TR'?'Gönderici':'Sender'}<input value={form.sender} onChange={e=>update('sender',e.target.value)} placeholder={c.defaultSender}/></label>
   <label>{region==='TR'?'Alıcı adı *':'Recipient *'}<input required value={form.recipient} onChange={e=>update('recipient',e.target.value)} placeholder={region==='TR'?'Alıcı adı soyadı':'Recipient name'}/></label>
   <label>{region==='TR'?'Müşteri kodu':'Customer code'}<input value={form.customer} onChange={e=>update('customer',e.target.value)} placeholder="FLX123456"/></label>
   <label>{region==='TR'?'Alıcı adresi':'Address'}<select value={form.addressChoice} onChange={e=>update('addressChoice',e.target.value)}>{(region==='TR'?trAddresses:usAddresses).map((a,i)=><option value={i} key={a}>{a}</option>)}</select></label>
   {((region==='TR'&&form.addressChoice==='2')||(region==='US'&&form.addressChoice==='1'))&&<label>{region==='TR'?'Manuel adres':'Manual address'}<textarea value={form.manualAddress} onChange={e=>update('manualAddress',e.target.value)}/></label>}
   <div className="grid2"><label>{region==='TR'?'Tarih':'Date'}<input type="date" value={form.date} onChange={e=>update('date',e.target.value)}/></label><label>Kg/Desi<input value={form.kg} onChange={e=>update('kg',e.target.value)} placeholder="1"/></label></div>
   <label>{region==='TR'?'Mahalle':'Area'}<input value={form.district} onChange={e=>update('district',e.target.value)} placeholder="KÜÇÜKÇEKMECE"/></label>
   {region==='TR'&&<label>Ürünler <small>(doldurularsa ikinci sayfa çıkar)</small><textarea rows="4" value={form.products} onChange={e=>update('products',e.target.value)} placeholder="1. Ürün adı / adet / renk..."/></label>}
   <div className="actions"><button onClick={()=>setTrack(nextTrack(c))}>Yeni takip kodu</button><button onClick={()=>window.print()}>Print et</button><button onClick={exportPdf}>PDF</button></div>
  </aside><main className="preview"><div ref={labelRef}><Label region={region} c={c} d={data}/></div>{region==='TR'&&data.products.trim()&&<ProductPage d={data} c={c}/>}</main></div>
 </>
}
function Row({title,children}){return <div className="row"><b>{title}</b><span>{children}</span></div>}
function Label({region,c,d}){ if(region==='US') return <USLabel c={c} d={d}/>; const props={c,d}; return <div className={`label t${c.tpl}`}>{c.tpl===1&&<T1 {...props}/>} {c.tpl===2&&<T2 {...props}/>} {c.tpl===3&&<T3 {...props}/>} {c.tpl===4&&<T4 {...props}/>} {c.tpl===5&&<T5 {...props}/>} {c.tpl===6&&<T6 {...props}/>} {c.tpl===7&&<T7 {...props}/>}</div>}
function T1({c,d}){return <><header><Logo c={c}/><div><h2>{c.name}</h2><p>{niceDate(d.date)} / PAKET / Kg: {d.kg}</p></div></header><div className="box slim"><Row title="GÖND.">{d.sender}</Row><Row title="ALICI">{d.recipient}<br/>{d.address}</Row></div><Barcode value={d.track} height={58}/><div className="codeLine">{d.track}</div><div className="district">{d.district}</div></>}
function T2({c,d}){return <><div className="topRoute">{d.district}</div><header><Logo c={c}/><div><h2>{c.name}</h2><p>{niceDate(d.date)} / Kg: {d.kg}</p></div></header><div className="box"><Row title="GÖNDEREN">{d.sender}</Row><Row title="ALICI">{d.recipient}<br/>{d.address}</Row></div><Barcode value={d.track} height={64}/><div className="district small">{d.district}</div><QR value={d.track}/></>}
function T3({c,d}){return <><Barcode value={d.track} className="topBar" height={34}/><header><Logo c={c}/><h2>{c.name}</h2></header><div className="box tall"><Row title="GÖNDEREN">{d.sender}</Row><Row title="ALICI">{d.recipient}<br/>{d.address}</Row></div><div className="info"><QR value={d.track}/><div><b>TAKİP NO:</b> {d.track}<br/><b>TARİH:</b> {niceDate(d.date)}<br/><b>KG/DS:</b> {d.kg}</div></div><div className="district">{d.district}</div></>}
function T4({c,d}){return <><header><Logo c={c}/><div><h2>{c.name}</h2><p>KARGO ETİKETİ</p></div></header><div className="box"><Row title="GÖNDERİCİ">{d.sender}</Row><Row title="ALICI">{d.recipient}<br/>{d.address}</Row></div><Barcode value={d.track} height={66}/><div className="district">{d.district}</div><div className="foot">{niceDate(d.date)} • Kg/Desi: {d.kg}</div></>}
function T5({c,d}){return <><header className="center"><Logo c={c} big/><h2>{c.name}</h2></header><div className="twobox"><div><b>Gönderici</b><p>{d.sender}</p></div><div><b>Alıcı</b><p>{d.recipient}<br/>{d.address}</p></div></div><Barcode value={d.track} height={68}/><div className="codeLine spaced">{d.track}</div><div className="district small">{d.district}</div></>}
function T6({c,d}){return <><div className="marketHead">Kargo şirketinin dikkatine, bu bir trendyol.com gönderisidir.</div><Logo c={c} big/><div className="trendyGrid"><div className="card"><h3>Alıcı Bilgileri</h3><p><b>Ad Soyad</b>: {d.recipient}</p><p><b>Adres</b>: {d.address}</p><h3>{d.district}</h3></div><div className="card"><h3>Kargo Barkodu</h3><Barcode value={d.track} height={62}/></div></div><div className="foot">Sipariş No: {rnd(10)} • Kg/Desi: {d.kg} • {niceDate(d.date)}</div></>}
function T7({c,d}){return <><header><Logo c={c}/><div><h2>{c.name}</h2><p>{niceDate(d.date)} / STANDART</p></div></header><div className="box"><Row title="GÖN.">{d.sender}</Row><Row title="ALICI">{d.recipient}<br/>{d.address}</Row></div><div className="sideRoute">{d.district}</div><Barcode value={d.track} height={68}/><div className="district">{d.district}</div></>}
function USLabel({c,d}){return <div className={`label us ${c.tpl}`}><header><Logo c={c}/><div><h2>{c.name} SHIPPING LABEL</h2><p>Date: {niceDate(d.date)} • Weight: {d.kg} lb</p></div></header><div className="usBoxes"><div><b>FROM</b><p>{d.sender}</p></div><div><b>SHIP TO</b><p>{d.recipient}<br/>{d.address}</p></div></div><div className="service">TRACKING #: {d.track}</div><Barcode value={d.track} height={64}/><div className="usBottom"><QR value={d.track}/><div><b>Service</b><br/>Ground / Standard Delivery<br/><b>Reference</b><br/>{d.customer||'AMZ-'+rnd(6)}</div></div></div>}
function ProductPage({d,c}){return <div className="label productPage"><header><Logo c={c}/><h2>ÜRÜN BİLGİLERİ</h2></header><div className="productBox">{d.products.split('\n').filter(Boolean).map((p,i)=><p key={i}><b>{i+1}.</b> {p}</p>)}</div><Barcode value={d.track} height={42}/></div>}

createRoot(document.getElementById('root')).render(<App/>);
