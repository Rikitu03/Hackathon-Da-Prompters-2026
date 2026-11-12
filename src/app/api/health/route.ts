import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({status:"ok",service:"gabayiskolar",configured:{supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),lumen:Boolean(process.env.LUMEN_API_KEY && process.env.LUMEN_API_SECRET)}})}
