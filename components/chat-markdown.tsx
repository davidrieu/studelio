import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

/**
 * Rendu Markdown (gras, italique, listes, titres, tableaux GFM) pour les messages d’André.
 */
export function ChatMarkdown({ content, className }: Props) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-inherit [&_*]:text-inherit",
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
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted/50 [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--studelio-blue)]/40 [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_hr]:my-4 [&_hr]:border-[var(--studelio-border)]",
        "[&_a]:text-[var(--studelio-blue)] [&_a]:underline",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
