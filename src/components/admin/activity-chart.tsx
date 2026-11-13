"use client";

import { useId, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import type { AdminData } from "./data";

export type MonthActivity={key:string;label:string;created:number;published:number};

export function monthlyActivity(data:AdminData,now=new Date()):MonthActivity[] {
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));
    return {
      key:d.toISOString().slice(0,7),
      label:d.toLocaleDateString("en-PH",{month:"short",timeZone:"UTC"}),
      created:0,published:0
    };
  });
  const byMonth=new Map(months.map((month,index)=>[month.key,index]));
  for(const program of data.programs) {
    if(!program.created_at)continue;
    const date=new Date(program.created_at);
    if(!Number.isFinite(date.getTime()))continue;
    const position=byMonth.get(date.toISOString().slice(0,7));
    if(position!==undefined)months[position].created+=1;
  }
  for(const cycle of data.cycles) {
    if(!cycle.published_at)continue;
    const date=new Date(cycle.published_at);
    if(!Number.isFinite(date.getTime()))continue;
    const position=byMonth.get(date.toISOString().slice(0,7));
    if(position!==undefined)months[position].published+=1;
  }
  return months;
}

type XY={x:number;y:number};
const LEFT=42,RIGHT=694,TOP=28,BOTTOM=204,WIDTH=728,HEIGHT=248;

/**
 * A shape-preserving cubic interpolation for established trends only.
 * Sparse activity uses straight segments: no exaggerated/artificial easing.
 */
export function activityPath(points:XY[],sparse=false):string {
  if(!points.length)return "";
  if(sparse || points.length<3)return points.map((p,i)=>(i?"L ":"M ")+p.x+" "+p.y).join(" ");
  const slopes=points.slice(1).map((point,i)=>(point.y-points[i].y)/(point.x-points[i].x));
  const tangents=points.map((_,i)=>{
    if(i===0)return slopes[0];
    if(i===points.length-1)return slopes[slopes.length-1];
    const left=slopes[i-1],right=slopes[i];
    // Flatten each turning point to prevent overshoot above observed values.
    if(left*right<=0)return 0;
    return Math.sign(left)*Math.min(Math.abs(left),Math.abs(right));
  });
  return points.slice(1).reduce((result,p,i)=>{
    const previous=points[i],width=p.x-previous.x;
    return result+" C "+(previous.x+width/3)+" "+(previous.y+tangents[i]*width/3)+
      " "+(p.x-width/3)+" "+(p.y-tangents[i+1]*width/3)+" "+p.x+" "+p.y;
  },"M "+points[0].x+" "+points[0].y);
}

function niceChartTop(maximum:number) {
  if(maximum<=4)return 4;
  const magnitude=Math.pow(10,Math.floor(Math.log10(maximum)));
  const scaled=maximum/magnitude;
  return (scaled<=2?2:scaled<=5?5:10)*magnitude;
}

/** Historical records only — not an application forecast or predictive trend. */
export function ScholarshipActivityChart({data}:{data:AdminData}) {
  const gradientId="admin-activity-fill-"+useId().replaceAll(":","");
  const months=useMemo(()=>monthlyActivity(data),[data]);
  const [activeMonth,setActiveMonth]=useState<number|null>(null);
  const createdTotal=months.reduce((sum,month)=>sum+month.created,0);
  const publishedTotal=months.reduce((sum,month)=>sum+month.published,0);
  const hasActivity=createdTotal+publishedTotal>0;
  const maxValue=Math.max(0,...months.flatMap(month=>[month.created,month.published]));
  const topValue=niceChartTop(maxValue);
  const x=(i:number)=>LEFT+(RIGHT-LEFT)*i/(months.length-1);
  const y=(count:number)=>BOTTOM-count/topValue*(BOTTOM-TOP);
  const created=months.map((month,i)=>({x:x(i),y:y(month.created)}));
  const published=months.map((month,i)=>({x:x(i),y:y(month.published)}));
  const sparse=months.filter(month=>month.created>0||month.published>0).length<=2;
  const first=activityPath(created,sparse),second=activityPath(published,sparse);
  const chosen=activeMonth===null?null:months[activeMonth];
  const activePoint=activeMonth===null?null:created[activeMonth];
  const tooltipX=activePoint?Math.max(6,Math.min(WIDTH-177,activePoint.x+14)):0;
  const tooltipY=activePoint?(activePoint.y>104?activePoint.y-79:activePoint.y+12):0;

  return (
    <section className="admin-analytics-card rounded-2xl bg-white p-5 sm:p-6" aria-labelledby="admin-activity-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="admin-activity-heading" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-[#102a51]">
            <Activity size={18} className="text-[#4779b2]" aria-hidden="true"/>Scholarship activity
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#53657b]">Guides created and cycles published over the last six months</p>
        </div>
        <span className="rounded-lg border border-[#dce4ed] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#53657b]">Last 6 months</span>
      </div>

      {!hasActivity?(
        <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d7dfe9] bg-[#f8fafc] px-5 text-center">
          <Activity size={25} className="text-[#7690af]" aria-hidden="true"/>
          <p className="mt-3 text-sm font-semibold text-[#102a51]">No activity to chart yet</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-[#53657b]">Created guides and published cycles will appear here as real records are saved.</p>
        </div>
      ):(
        <>
          <div className="relative mt-5" onMouseLeave={()=>setActiveMonth(null)}>
            <svg
              viewBox={"0 0 "+WIDTH+" "+HEIGHT}
              role="img"
              aria-label={"Monthly scholarship activity: "+months.map(m=>m.label+" "+m.created+" created and "+m.published+" published").join("; ")}
              className="h-auto w-full overflow-visible"
              data-chart="scholarship-activity"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4779b2" stopOpacity=".17"/>
                  <stop offset="100%" stopColor="#4779b2" stopOpacity=".01"/>
                </linearGradient>
              </defs>
              {[0,1,2,3,4].map(step=>{
                const value=topValue*step/4,gridY=y(value);
                return <g key={step}>
                  <line x1={LEFT} x2={RIGHT} y1={gridY} y2={gridY} stroke="#e7edf4" strokeWidth="1" strokeDasharray={step?"3 6":undefined}/>
                  <text x={LEFT-12} y={gridY+4} fill="#65788e" fontSize="12" textAnchor="end">{Number.isInteger(value)?value:value.toFixed(1)}</text>
                </g>;
              })}
              <path d={first+" L "+RIGHT+" "+BOTTOM+" L "+LEFT+" "+BOTTOM+" Z"} fill={"url(#"+gradientId+")"} pointerEvents="none"/>
              <path d={first} fill="none" stroke="#4779b2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"/>
              <path d={second} fill="none" stroke="#8998ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 6" pointerEvents="none"/>
              {months.map((month,i)=><g key={month.key}>
                <text x={x(i)} y="235" fill={activeMonth===i?"#102a51":"#60758d"} fontSize="13" fontWeight={activeMonth===i?"600":"400"} textAnchor="middle">{month.label}</text>
                {/* Large pointer hit regions are intentionally NOT keyboard focus targets. */}
                <rect data-chart-hit="month" data-month={month.key}
                  x={x(i)-Math.min(45,(RIGHT-LEFT)/(months.length-1)/2)} y={TOP-6}
                  width={Math.min(90,(RIGHT-LEFT)/(months.length-1))} height={BOTTOM-TOP+12}
                  fill="transparent" onMouseEnter={()=>setActiveMonth(i)}
                  onMouseMove={()=>setActiveMonth(i)} />
              </g>)}
              {activeMonth!==null && activePoint && chosen?<g pointerEvents="none">
                <line x1={activePoint.x} x2={activePoint.x} y1={TOP} y2={BOTTOM} stroke="#a0b7d3" strokeWidth="1" strokeDasharray="3 6"/>
                <circle cx={activePoint.x} cy={activePoint.y} r="5.7" fill="#fff" stroke="#4779b2" strokeWidth="2.5"/>
                <circle cx={published[activeMonth].x} cy={published[activeMonth].y} r="4.3" fill="#fff" stroke="#8998ac" strokeWidth="2"/>
                <g transform={"translate("+tooltipX+" "+tooltipY+")"} data-chart-tooltip="true">
                  <rect width="163" height="65" rx="9" fill="#fff" stroke="#d5dfe9" strokeWidth="1"/>
                  <text x="12" y="19" fill="#102a51" fontSize="12" fontWeight="600">{chosen.label+" "+chosen.key.slice(0,4)}</text>
                  <circle cx="16" cy="35" r="3" fill="#4779b2"/>
                  <text x="26" y="39" fill="#465b73" fontSize="11.5">{chosen.created+" guides created"}</text>
                  <circle cx="16" cy="52" r="3" fill="#8998ac"/>
                  <text x="26" y="56" fill="#465b73" fontSize="11.5">{chosen.published+" cycles published"}</text>
                </g>
              </g>:null}
            </svg>
          </div>
          {/* Separate, touch-friendly and keyboard-accessible month selection like the Ysabelle forecast UI. */}
          <div className="mt-1 grid grid-cols-6 gap-1" role="group" aria-label="Select activity month">
            {months.map((month,i)=><button
              key={month.key} type="button"
              aria-pressed={activeMonth===i}
              aria-label={month.label+" "+month.key.slice(0,4)+": "+month.created+" guides created, "+month.published+" cycles published"}
              onClick={()=>setActiveMonth(activeMonth===i?null:i)}
              onFocus={()=>setActiveMonth(i)}
              className={"min-h-9 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0] "+
                (activeMonth===i?"bg-[#eaf1f9] text-[#102a51]":"text-[#53657b] hover:bg-[#f1f5fa]")}
            >{month.label}</button>)}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#687a90]">{sparse?"Limited history — straight segments show recorded monthly counts without smoothing.":"Monthly counts based on saved record dates, not predictions."}</p>
        </>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf4] pt-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#53657b]">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-[#4779b2]"/>Guides created</span>
          <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-[#8998ac]"/>Cycles published</span>
        </div>
        <p className="text-xs tabular-nums text-[#53657b]">{createdTotal} created · {publishedTotal} published</p>
      </div>
    </section>
  );
}
