import type { ReactNode } from "react";

type EvidenceProps = {
  source: ReactNode;
  method: string;
  assumptions: string;
  period?: string;
};

export default function DecisionEvidence({ source, method, assumptions, period }: EvidenceProps) {
  return (
    <details className="decision-evidence">
      <summary>Kanıt Defteri · Veri ve hesaplama yöntemi</summary>
      <dl>
        <div><dt>Kaynak</dt><dd>{source}</dd></div>
        {period && <div><dt>Veri dönemi</dt><dd>{period}</dd></div>}
        <div><dt>Hesaplama</dt><dd>{method}</dd></div>
        <div><dt>Varsayımlar</dt><dd>{assumptions}</dd></div>
      </dl>
    </details>
  );
}
