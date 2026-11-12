export type DebtDecisionAnswer = { debtCount: "one" | "multiple"; hasRefinanceOffer: boolean; hasLumpSum: boolean };
export type DebtDecisionRecommendation = { id: "installment" | "payoff" | "refinance" | "early_payoff"; href: string; title: string; reason: string };

export function recommendDebtTool(answer: DebtDecisionAnswer): DebtDecisionRecommendation {
  if (answer.hasRefinanceOffer) return { id: "refinance", href: "/borc-yapilandirma-hesaplama", title: "Yapılandırma teklifini karşılaştır", reason: "Elinde yeni bir teklif olduğu için önce eski ve yeni planın toplam maliyetini aynı ekranda karşılaştırmalısın." };
  if (answer.debtCount === "one" && answer.hasLumpSum) return { id: "early_payoff", href: "/kredi-erken-kapama-hesaplama", title: "Erken kapama avantajını ölç", reason: "Tek borcun ve kullanabileceğin toplu para var. Kalan taksitlerle güncel kapama tutarını karşılaştırmak en doğru ilk adım." };
  if (answer.debtCount === "multiple") return { id: "payoff", href: "/borc-hesaplama#borctan-kurtulma", title: "Borçtan kurtulma planı oluştur", reason: answer.hasLumpSum ? "Birden fazla borcun var. Toplu parayı başlangıç bakiyelerine yansıttıktan sonra faiz çığı ve kartopu sıralarını karşılaştır." : "Birden fazla borcun var. Aynı aylık bütçeyle faiz çığı ve kartopu yöntemlerinin süre ve faiz farkını gör." };
  return { id: "installment", href: "/borc-hesaplama", title: "Taksit ve toplam faiz hesabıyla başla", reason: "Tek borcun için aylık taksit, toplam geri ödeme ve faiz yükünü netleştirmek en doğru ilk adım." };
}
