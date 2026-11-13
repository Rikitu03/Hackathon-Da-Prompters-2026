"use client";

import { useId, useMemo, useState } from "react";
import { Activity, CalendarDays } from "lucide-react";
import type { AdminData } from "./data";

export type MonthActivity={key:string;label:string;created:number;published:number};

export function monthlyActivity(data:AdminData, now=new Date()):MonthActivity[] {
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));
    return {key:d.toISOString().slice(0,7),label:d.toLocaleDateString("en-PH",{month:"short",timeZone:"UTC"}),created:0,published:0};
  });
  const lookup=new Map(months.map((m,i)=>[m.key,i]));
  for(const p of data.programs) {
    const date=p.created_at?new Date(p.created_at):null;
    if(date && Number.isFinite(date.getTime())) {
      const index=lookup.get(date.toISOString().slice(0,7));
      if(index!==undefined)months[index].created++;
    }
  }
  for(const c of data.cycles) {
    const date=c.published_at?new Date(c.published_at):null;
    if(date && Number.isFinite(date.getTime())) {
      const index=lookup.get(date.toISOString().slice(0,7));
      if(index!==undefined)months[index].published++;
    }
  }
  return months;
}

type Position={x:number;y:number};
const X0=34,X1=700,Y0=24,Y1=196;
function smoothPath(points:Position[]):string {
  return points.reduce((acc,p,i)=>{
    if(i===0)return "M "+p.x+" "+p.y;
    const before=points[i-1],middle=(before.x+p.x)/2;
    return acc+" C "+middle+" "+before.y+" "+middle+" "+p.y+" "+p.x+" "+p.y;
  },"");
}

/** Real program-created and cycle-published timestamps; never interpolates missing history. */
export function ScholarshipActivityChart({data}: {data:AdminData}) {
  const id=useId().replaceAll(":","");
  const gradientId="admin-activity-gradient-"+id;
  const points=useMemo(()=>monthlyActivity(data),[data]);
  const [hovered,setHovered]=useState<number|null>(null);
  const hasActivity=points.some(p=>p.created>0 || p.published>0);
  const maxValue=Math.max(1,...points.map(p=>Math.max(p.created,p.published)));
  const top=Math.max(4,Math.ceil(maxValue/4)*4);
  const coords=(type:"created"|"published")=>points.map((p,i)=>({x:X0+i*(X1-X0)/(points.length-1),y:Y1-p[type]/top*(Y1-Y0)}));
  const created=coords("created"),published=coords("published");
  const selected=hovered===null?null:points[hovered];
  const highlight=hovered===null?null:created[hovered];
  const createdTotal=points.reduce((sum,p)=>sum+p.created,0);
  const publishedTotal=points.reduce((sum,p)=>sum+p.published,0);

  return <section className="admin-analytics-card rounded-2xl bg-white p-5 sm:p-6" aria-labelledby="admin-activity-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.11em] text-[#53657b]"><Activity size={15} aria-hidden="true"/> Activity overview</p>
        <h2 id="admin-activity-heading" className="text-lg font-semibold tracking-tight text-[#102a51]">Scholarship activity</h2>
        <p className="mt-1 text-sm leading-6 text-[#53657b]">Guides created and cycles published · last six calendar months</p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#e1e7ef] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#465973]"><CalendarDays size={15}/> Last 6 months</div>
    </div>
    {!hasActivity?<div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d7dfe9] bg-[#f8fafc] px-5 text-center">
      <Activity size={26} className="text-[#7690af]"/>
      <p className="mt-3 text-sm font-semibold text-[#102a51]">No activity in this period</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[#53657b]">The chart uses recorded creation and publication dates. No sample trends are added to live data.</p>
    </div>:<div className="relative mt-5">
      <svg viewBox="0 0 728 238" role="img" aria-label={"Monthly scholarship activity: "+points.map(p=>p.label+" "+p.created+" created, "+p.published+" published").join("; ")} className="h-auto w-full">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4779B2" stopOpacity=".20"/>
          <stop offset="100%" stopColor="#4779B2" stopOpacity=".01"/>
        </linearGradient></defs>
        {[0,1,2,3,4].map(k=>{
          const y=Y1-k*(Y1-Y0)/4;
          return <g key={k}>
            <line x1={X0} x2={X1} y1={y} y2={y} stroke="#e6ebf2" strokeWidth="1" strokeDasharray={k===0?"0":"3 5"}/>
            <text x={X0-11} y={y+4} fill="#697b91" fontSize="12" textAnchor="end">{Math.round(top*k/4)}</text>
          </g>;
        })}
        <path d={smoothPath(created)+" L "+X1+" "+Y1+" L "+X0+" "+Y1+" Z"} fill={"url(#"+gradientId+")"}/>
        <path d={smoothPath(created)} fill="none" stroke="#4779B2" strokeWidth="2.8" strokeLinecap="round"/>
        <path d={smoothPath(published)} fill="none" stroke="#8995AA" strokeWidth="2.1" strokeLinecap="round" strokeDasharray="5 5"/>
        {points.map((p,i)=><g key={p.key}>
          <text x={created[i].x} y="224" textAnchor="middle" fill="#66788e" fontSize="13">{p.label}</text>
          <rect x={created[i].x-24} y={Y0-10} width="48" height={Y1-Y0+20}
            fill="transparent" tabIndex={0} role="button"
            aria-label={p.label+": "+p.created+" guides created and "+p.published+" cycles published"}
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
            onFocus={()=>setHovered(i)} onBlur={()=>setHovered(null)}
            onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();setHovered(i);}}}
            className="cursor-crosshair focus-visible:outline-2 focus-visible:outline-[#155bb0]"/>
        </g>)}
        {highlight && hovered!==null?<g pointerEvents="none">
          <line x1={highlight.x} x2={highlight.x} y1={Y0} y2={Y1} stroke="#9aaec9" strokeDasharray="4 5"/>
          <circle cx={highlight.x} cy={highlight.y} r="5.5" fill="#fff" stroke="#4779B2" strokeWidth="3"/>
          <circle cx={published[hovered].x} cy={published[hovered].y} r="4" fill="#8995AA" stroke="#fff" strokeWidth="1.5"/>
        </g>:null}
      </svg>
      {selected && highlight?<div role="status" className="pointer-events-none absolute top-0 rounded-lg border border-[#d7dfe9] bg-white px-3 py-2 shadow-md" style={{left:Math.min(75,Math.max(0,highlight.x/728*100-7))+"%"}}>
        <p className="text-xs font-semibold text-[#102a51]">{selected.label}</p>
        <p className="mt-1 text-xs text-[#53657b]">{selected.created} created · {selected.published} published</p>
      </div>:null}
    </div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ecf3] pt-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#53657b]">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-[#4779B2]"/>Guides created</span>
        <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-[#8995AA]"/>Cycles published</span>
      </div>
      <p className="text-xs tabular-nums text-[#53657b]">{createdTotal} created · {publishedTotal} published</p>
    </div>
  </section>;
}
