import Link from "next/link";

export default function DebtDecisionNav() { return <nav className="debt-decision-nav" aria-label="Diğer borç araçları"><span>Başka bir borç kararı mı vereceksin?</span><Link href="/borc-karar-merkezi">Borç Karar Merkezi’ne dön →</Link></nav>; }
