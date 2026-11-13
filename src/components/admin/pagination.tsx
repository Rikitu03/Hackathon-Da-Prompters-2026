"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const ADMIN_PAGE_SIZE=10;
type Token=number|"left-ellipsis"|"right-ellipsis";

export function pageTokens(current:number,total:number):Token[] {
  if(total<=1)return [];
  if(total<=7)return Array.from({length:total},(_,i)=>i+1);
  if(current<=4)return [1,2,3,4,5,"right-ellipsis",total];
  if(current>=total-3)return [1,"left-ellipsis",total-4,total-3,total-2,total-1,total];
  return [1,"left-ellipsis",current-1,current,current+1,"right-ellipsis",total];
}
export function safeAdminPage(page:number,totalItems:number,pageSize=ADMIN_PAGE_SIZE):number {
  return Math.max(1,Math.min(page,Math.max(1,Math.ceil(totalItems/pageSize))));
}

/** Ysabelle-style numbered navigation, no page size selector; hidden for <= 10 items. */
export function AdminPagination({page,totalItems,onPageChange,label="records",pageSize=ADMIN_PAGE_SIZE}:{
  page:number;totalItems:number;onPageChange:(page:number)=>void;label?:string;pageSize?:number;
}) {
  if(totalItems<=pageSize)return null;
  const total=Math.ceil(totalItems/pageSize);
  const current=safeAdminPage(page,totalItems,pageSize);
  const start=(current-1)*pageSize+1;
  const end=Math.min(totalItems,current*pageSize);
  return <nav aria-label={label+" pagination"} className="admin-pagination flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-t border-[#d7e3ef] px-4 py-3.5 sm:px-5">
    <p className="text-xs text-[#53657b]">Showing <span className="font-semibold tabular-nums text-[#102a51]">{start}–{end}</span> of <span className="font-semibold tabular-nums text-[#102a51]">{totalItems}</span> {label}</p>
    <div className="flex items-center gap-1" role="group" aria-label="Pages">
      <button type="button" aria-label="Previous page" disabled={current===1} onClick={()=>onPageChange(current-1)} className="admin-page-button"><ChevronLeft size={16} aria-hidden="true"/></button>
      {pageTokens(current,total).map((token,i)=>typeof token==="number"?<button type="button" key={token} aria-label={"Page "+token} aria-current={token===current?"page":undefined} disabled={token===current} onClick={()=>onPageChange(token)} className={"admin-page-button admin-page-number"+(token===current?" is-current":"")}>{token}</button>:<span key={token+i} aria-hidden="true" className="admin-page-ellipsis">…</span>)}
      <button type="button" aria-label="Next page" disabled={current===total} onClick={()=>onPageChange(current+1)} className="admin-page-button"><ChevronRight size={16} aria-hidden="true"/></button>
    </div>
  </nav>;
}
