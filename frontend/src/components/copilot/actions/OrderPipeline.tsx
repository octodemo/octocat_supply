interface Order {
  orderId: number;
  branchId: number;
  name: string;
  status: string;
}

interface Branch {
  branchId: number;
  name: string;
}

interface OrderPipelineProps {
  orders: Order[];
  branches: Branch[];
}

const STATUS_CONFIG: Record<string, { emoji: string; label: string; bg: string; bar: string }> = {
  pending: {
    emoji: '😺',
    label: 'Napping on it',
    bg: 'bg-yellow-900/30',
    bar: 'bg-yellow-500',
  },
  processing: {
    emoji: '🐱',
    label: 'Knocking things off shelves',
    bg: 'bg-blue-900/30',
    bar: 'bg-blue-500',
  },
  shipped: {
    emoji: '🏃‍♂️🐈',
    label: 'Zoomies activated!',
    bg: 'bg-purple-900/30',
    bar: 'bg-purple-500',
  },
  delivered: {
    emoji: '😻',
    label: 'Purr-fect!',
    bg: 'bg-green-900/30',
    bar: 'bg-green-500',
  },
  cancelled: {
    emoji: '🙀',
    label: 'Hissed at it',
    bg: 'bg-red-900/30',
    bar: 'bg-red-500',
  },
};

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrderPipeline({ orders, branches }: OrderPipelineProps) {
  const branchMap = new Map(branches.map((b) => [b.branchId, b.name]));
  const totalOrders = orders.length;
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    orders: orders.filter((o) => o.status === status),
  }));

  const deliveredCount = grouped.find((g) => g.status === 'delivered')?.orders.length ?? 0;
  const cancelledCount = grouped.find((g) => g.status === 'cancelled')?.orders.length ?? 0;
  const completionRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  return (
    <div className="rounded-lg bg-gray-900 p-4 text-white text-sm w-full max-w-md">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>📦</span> Order Pipeline
      </h3>
      <div className="space-y-2.5">
        {grouped.map(({ status, config, orders: statusOrders }) => {
          const pct = totalOrders > 0 ? (statusOrders.length / totalOrders) * 100 : 0;
          const displayOrders = statusOrders.slice(0, 3);
          const remaining = statusOrders.length - displayOrders.length;

          return (
            <div key={status} className={`rounded-lg p-2.5 ${config.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">
                  {config.emoji} {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {statusOrders.length} order{statusOrders.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-1.5">
                <div
                  className={`h-2 rounded-full ${config.bar}`}
                  style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                />
              </div>
              {displayOrders.length > 0 && (
                <div className="space-y-0.5">
                  {displayOrders.map((order) => (
                    <div key={order.orderId} className="text-[10px] text-gray-400 flex justify-between">
                      <span className="truncate max-w-[160px]">#{order.orderId} {order.name}</span>
                      <span>{branchMap.get(order.branchId) ?? `Branch ${order.branchId}`}</span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <div className="text-[10px] text-gray-500 italic">
                      ...and {remaining} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <span>
          Completion rate: <span className="text-green-400 font-bold">{completionRate}%</span>
        </span>
        <span>
          Cancelled: <span className="text-red-400 font-bold">{cancelledCount}</span>
        </span>
      </div>
    </div>
  );
}
