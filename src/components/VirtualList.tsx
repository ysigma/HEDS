import { useState, type ReactNode, type UIEvent } from 'react';

interface VirtualListProps {
  itemCount: number;
  itemHeight: number;
  maxHeight: number;
  renderItem: (index: number) => ReactNode;
  className?: string;
  overscan?: number;
}

/**
 * Minimal fixed-height windowed list so very wide tables (200+ columns) and
 * large dropdown value lists stay fast without a virtualization dependency.
 */
export function VirtualList({
  itemCount,
  itemHeight,
  maxHeight,
  renderItem,
  className,
  overscan = 8,
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewport = Math.min(maxHeight, itemCount * itemHeight);
  const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const last = Math.min(
    itemCount,
    Math.ceil((scrollTop + viewport) / itemHeight) + overscan,
  );

  const items = [];
  for (let index = first; index < last; index += 1) {
    items.push(
      <div
        key={index}
        style={{
          position: 'absolute',
          top: index * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(index)}
      </div>,
    );
  }

  return (
    <div
      className={className}
      style={{ overflowY: 'auto', maxHeight }}
      onScroll={(event: UIEvent<HTMLDivElement>) =>
        setScrollTop(event.currentTarget.scrollTop)
      }
    >
      <div style={{ height: itemCount * itemHeight, position: 'relative' }}>
        {items}
      </div>
    </div>
  );
}
