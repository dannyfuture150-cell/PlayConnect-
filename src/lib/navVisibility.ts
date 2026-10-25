/** Pages you open from a tab (a chat, a tournament, a group...) hide the bottom tabs so they get the whole screen. */
export function hidesTabs(pathname: string | null | undefined): boolean {
  return /^\/(messages|tournaments|leagues|communities|posts|live|watch)\/[^/]+/.test(pathname ?? "");
}
