export const SHOP_RULES = [
  "Every deal is strictly between the buyer and the seller. PlayConnect is not part of it.",
  "PlayConnect does not hold money, deliver items or guarantee any sale, and is not responsible for losses or disputes.",
  "Agree price and delivery in the private chat between you two. Don't send money to anyone outside the deal.",
  "Meet in a public place or use a method you trust. Check the item before you pay in full.",
  "Only post items you own. No stolen, hacked or fake accounts, and nothing illegal.",
  "Be honest about condition and price. Mark items as sold once they're gone.",
  "Listings that break these rules can be removed and the seller banned.",
];

/** The shop's ground rules, shown on the shop page, before selling and on every listing. */
export function ShopRulesList({ className }: { className?: string }) {
  return (
    <ol className={className ?? "list-decimal space-y-2 pl-5 text-sm text-steel/80"}>
      {SHOP_RULES.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ol>
  );
}
