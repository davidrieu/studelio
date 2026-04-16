import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

function isProseFenceClass(className: string | undefined): boolean {
  return /\blanguage-(text|plain)\b/.test(className ?? "");
}

/**
 * Rendu Markdown (gras, italique, listes, titres, tableaux GFM) pour les messages d’André.
 * Poésie / extraits : interligne « recueil » (pas leading-relaxed), strophe = saut de paragraphe léger.
 */
export function ChatMarkdown({ content, className }: Props) {
  return (
    <div
      className={cn(
        "text-sm leading-normal text-inherit [&_*]:text-inherit",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_li]:pl-0.5",
        "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:font-display [&_h1]:text-lg [&_h1]:font-semibold first:[&_h1]:mt-0",
        "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:font-semibold [&_h2]:text-base first:[&_h2]:mt-0",
        "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold first:[&_h3]:mt-0",
        "[&_table]:my-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs sm:[&_table]:text-sm",
        "[&_thead]:bg-muted/60",
        "[&_th]:border [&_th]:border-[var(--studelio-border)] [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-medium",
        "[&_td]:border [&_td]:border-[var(--studelio-border)] [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top",
        "[&_tr:nth-child(even)]:bg-muted/20",
        "[&_code]:rounded [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_hr]:my-4 [&_hr]:border-[var(--studelio-border)]",
        "[&_a]:text-[var(--studelio-blue)] [&_a]:underline",
        "[&_blockquote_code]:bg-muted/50 [&_blockquote_code]:text-[0.9em]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-[var(--studelio-blue)]/35 pl-3 text-left font-normal not-italic leading-[1.45] text-[var(--studelio-text-body)] [&>p]:!mb-0 [&>p]:!mt-0 [&>p]:leading-[1.45] [&>p+p]:!mt-[1.15em]">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--studelio-border)]/40 bg-muted/25 px-3 py-2 font-sans text-sm leading-[1.45] text-inherit">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const fence = Boolean(className?.includes("language-"));
            if (fence && isProseFenceClass(className)) {
              return (
                <code
                  className={cn(
                    "block w-full bg-transparent p-0 font-sans text-sm font-normal leading-[1.45] text-inherit",
                    className,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            if (fence) {
              return (
                <code
                  className={cn("block w-full bg-transparent p-0 font-mono text-sm leading-normal", className)}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn("rounded bg-muted/80 px-1 py-0.5 font-mono text-[0.85em]", className)}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
