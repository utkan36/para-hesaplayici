import assert from "node:assert/strict";
import test from "node:test";
import { recommendDebtTool } from "../lib/debt-decision-guide.ts";

test("yapılandırma teklifi varsa önce teklif karşılaştırmasını önerir", () => { assert.equal(recommendDebtTool({ debtCount: "multiple", hasRefinanceOffer: true, hasLumpSum: true }).id, "refinance"); });
test("tek borç ve toplu para için erken kapamayı önerir", () => { assert.equal(recommendDebtTool({ debtCount: "one", hasRefinanceOffer: false, hasLumpSum: true }).id, "early_payoff"); });
test("birden fazla borç için borçsuzluk planını önerir", () => { assert.equal(recommendDebtTool({ debtCount: "multiple", hasRefinanceOffer: false, hasLumpSum: false }).id, "payoff"); });
test("tek borç için temel taksit hesabıyla başlatır", () => { assert.equal(recommendDebtTool({ debtCount: "one", hasRefinanceOffer: false, hasLumpSum: false }).id, "installment"); });
