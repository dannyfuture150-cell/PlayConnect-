import { Fragment } from "react";
import Link from "next/link";

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]])/gi;
const MENTION_RE = /(^|[^\w@])@([a-z0-9_]{2,20})/gi;

/** Splits plain text into pieces; pieces at odd positions are @names (without the @). */
function splitMentions(text: string): string[] {
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text))) {
    out.push(text.slice(last, m.index) + m[1], m[2]);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** Turns links into tappable links and @names into links to that player's profile. */
export function Linkify({ text, className, mentionClassName }: { text: string; className?: string; mentionClassName?: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={(e) => e.stopPropagation()}
              className={className ?? "break-all font-medium underline underline-offset-2"}
            >
              {part}
            </a>
          );
        }
        return (
          <Fragment key={i}>
            {splitMentions(part).map((piece, j) =>
              j % 2 === 1 ? (
                <Link
                  key={j}
                  href={`/profile/${piece.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                  className={mentionClassName ?? "font-semibold underline underline-offset-2"}
                >
                  @{piece}
                </Link>
              ) : (
                <Fragment key={j}>{piece}</Fragment>
              )
            )}
          </Fragment>
        );
      })}
    </>
  );
}
