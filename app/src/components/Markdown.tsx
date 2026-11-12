import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

// Full GitHub-flavoured Markdown (tables, lists, task lists, strikethrough, links) for AI answers,
// styled to the app. Raw HTML in the text is not rendered.
const components: Components = {
  p: ({ node: _n, ...p }) => <p className="my-2 first:mt-0 last:mb-0" {...p} />,
  h1: ({ node: _n, ...p }) => <h3 className="mb-1.5 mt-3 text-[16px] font-semibold first:mt-0" {...p} />,
  h2: ({ node: _n, ...p }) => <h3 className="mb-1.5 mt-3 text-[15px] font-semibold first:mt-0" {...p} />,
  h3: ({ node: _n, ...p }) => <h4 className="mb-1 mt-3 text-[14px] font-semibold first:mt-0" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground" {...p} />,
  li: ({ node: _n, ...p }) => <li className="pl-0.5" {...p} />,
  a: ({ node: _n, ...p }) => <a className="font-medium text-brand underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />,
  strong: ({ node: _n, ...p }) => <strong className="font-semibold text-foreground" {...p} />,
  blockquote: ({ node: _n, ...p }) => <blockquote className="my-2 border-l-2 border-brand/40 pl-3 text-muted-foreground" {...p} />,
  hr: () => <hr className="my-3 border-border" />,
  code: ({ node: _n, className, ...p }) => <code className={cn('tracking-code rounded bg-muted px-1 py-0.5 text-[12px]', className)} {...p} />,
  pre: ({ node: _n, ...p }) => <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3 text-[12px] [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  table: ({ node: _n, ...p }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-max min-w-full border-collapse text-left text-[13px]" {...p} />
    </div>
  ),
  thead: ({ node: _n, ...p }) => <thead className="bg-muted/70" {...p} />,
  th: ({ node: _n, ...p }) => <th className="whitespace-nowrap border-b border-border px-2.5 py-1.5 font-semibold" {...p} />,
  td: ({ node: _n, ...p }) => <td className="max-w-[16rem] border-b border-border/60 px-2.5 py-1.5 align-top [tr:last-child_&]:border-b-0" {...p} />,
  input: ({ node: _n, ...p }) => <input className="mr-1.5 align-middle accent-[var(--brand)]" disabled {...p} />,
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('min-w-0 break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  )
}
