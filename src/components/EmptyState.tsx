import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center"
    >
      <div className="mb-1 flex size-16 items-center justify-center rounded-3xl bg-accent text-aura-1 [&_svg]:size-8">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body ? <p className="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </motion.div>
  );
}
