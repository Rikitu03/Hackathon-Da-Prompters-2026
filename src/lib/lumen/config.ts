/** Server-only: never import into a client component. */
import "server-only";
export function getLumenConfig(){const key=process.env.LUMEN_API_KEY;const secret=process.env.LUMEN_API_SECRET;
 if(!key || !secret) throw new Error("Lumen credentials missing");
 return {key,secret,ocrUrl:process.env.LUMEN_OCR_URL,chatUrl:process.env.LUMEN_CHAT_URL};
}
export function lumenHeaders(key:string,secret:string){ return {"lumen-api-key":key,"lumen-api-secret":secret}; }
