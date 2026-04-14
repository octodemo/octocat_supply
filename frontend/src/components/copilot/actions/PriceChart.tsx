interface Product {
  productId: number;
  name: string;
  price: number;
  discount?: number;
}

interface PriceChartProps {
  products: Product[];
  sortBy?: string;
}

export default function PriceChart({ products, sortBy }: PriceChartProps) {
  const sorted = [...products].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'discount') return (b.discount ?? 0) - (a.discount ?? 0);
    return b.price - a.price;
  });

  const maxPrice = Math.max(...sorted.map((p) => p.price));
  const cheapest = sorted.reduce((min, p) => (p.price < min.price ? p : min), sorted[0]);
  const priciest = sorted.reduce((max, p) => (p.price > max.price ? p : max), sorted[0]);

  return (
    <div className="rounded-lg bg-gray-900 p-4 text-white text-sm w-full max-w-md">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>📊</span> Product Price Chart
      </h3>
      <div className="space-y-2">
        {sorted.map((product, i) => {
          const widthPct = maxPrice > 0 ? (product.price / maxPrice) * 100 : 0;
          const discountPct = product.discount ? Math.round(product.discount * 100) : 0;
          return (
            <div key={product.productId}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="truncate max-w-[140px] text-xs text-gray-300">
                  {product.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {discountPct > 0 && (
                    <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-semibold">
                      🏷️ {discountPct}% off
                    </span>
                  )}
                  <span className="font-mono text-xs">${product.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${i % 2 === 0 ? 'bg-green-500' : 'bg-emerald-400'}`}
                  style={{ width: `${widthPct}%`, transition: 'width 0.5s ease' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>
          Cheapest: <span className="text-green-400">{cheapest.name}</span> ($
          {cheapest.price.toFixed(2)})
        </span>
        <span>
          Priciest: <span className="text-red-400">{priciest.name}</span> ($
          {priciest.price.toFixed(2)})
        </span>
      </div>
    </div>
  );
}
