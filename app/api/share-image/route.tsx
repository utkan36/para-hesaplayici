import { ImageResponse } from "next/og";
import { describeSharedResult } from "../../share-metadata";

export async function GET(request: Request) {
  const details = describeSharedResult(new URL(request.url).searchParams);
  return new ImageResponse(<div style={{ background: "#10271f", color: "white", display: "flex", flexDirection: "column", fontFamily: "Arial", height: "100%", padding: "72px", width: "100%" }}>
    <div style={{ color: "#b9df73", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>₺ PARA HESAPLAYICI · {details.eyebrow}</div>
    <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}><div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.12, maxWidth: 1000 }}>{details.title}</div><div style={{ color: "#b9df73", display: "flex", fontSize: 76, fontWeight: 700, marginTop: 40 }}>{details.result}</div><div style={{ color: "#b7c7c0", display: "flex", fontSize: 25, lineHeight: 1.45, marginTop: 32, maxWidth: 940 }}>{details.description}</div></div>
    <div style={{ alignItems: "center", borderTop: "1px solid #496159", color: "#dce7e2", display: "flex", fontSize: 20, justifyContent: "space-between", paddingTop: 28 }}><span>Sen de kendi hesabını oluştur</span><span>para-hesaplayici.utkanyilmaz.chatgpt.site</span></div>
  </div>, { height: 630, width: 1200 });
}
