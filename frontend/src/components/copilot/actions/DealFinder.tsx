interface Product {
  productId: number;
  name: string;
  price: number;
  discount?: number;
}

interface DealFinderProps {
  products: Product[];
}

function getDealLabel(discountPct: number): { label: string; color: string } {
  if (discountPct >= 25) return { label: 'LEGENDARY DEAL!', color: 'text-yellow-300' };
  if (discountPct >= 20) return { label: "Paws-itively Great!", color: 'text-green-300' };
  if (discountPct >= 15) return { label: 'Cat-ching Savings!', color: 'text-blue-300' };
  if (discountPct >= 10) return { label: 'Whisker-worthy', color: 'text-purple-300' };
  return { label: 'Mice Deal', color: 'text-gray-300' };
}

const TUNA_CAN_PRICE = 2.5;

export default function DealFinder({ products }: DealFinderProps) {
  const deals = products
    .filter((p) => p.discount && p.discount > 0)
    .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));

  if (deals.length === 0) {
    return (
      <div className="rounded-lg bg-gray-900 p-4 text-white text-sm w-full max-w-md text-center">
        <div className="text-3xl mb-2">😿</div>
        <p className="text-gray-400">No deals right meow...</p>
        <p className="text-xs text-gray-500 mt-1">Check back later for paw-some discounts!</p>
      </div>
    );
  }

  const totalSavings = deals.reduce((sum, p) => {
    const discountPct = (p.discount ?? 0) * 100;
    return sum + p.price * (discountPct / 100);
  }, 0);
  const tunaCans = Math.floor(totalSavings / TUNA_CAN_PRICE);

  return (
    <div className="rounded-lg bg-gray-900 p-4 text-white text-sm w-full max-w-md">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>🏷️</span> Deal Finder
      </h3>
      <div className="space-y-2.5">
        {deals.map((product) => {
          const discountPct = Math.round((product.discount ?? 0) * 100);
          const salePrice = product.price * (1 - (product.discount ?? 0));
          const saved = product.price - salePrice;
          const { label, color } = getDealLabel(discountPct);

          return (
            <div key={product.productId} className="bg-gray-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-xs truncate max-w-[150px]">{product.name}</span>
                <span className={`text-[10px] font-bold ${color}`}>{label}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1.5">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                  style={{ width: `${discountPct * 4}%`, maxWidth: '100%' }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="line-through text-gray-500">${product.price.toFixed(2)}</span>
                  <span className="text-green-400 ml-1.5 font-bold">${salePrice.toFixed(2)}</span>
                </div>
                <span className="text-yellow-400 text-[11px]">You save ${saved.toFixed(2)}!</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700 bg-gradient-to-r from-yellow-900/30 to-green-900/30 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-yellow-400">
          Total savings: ${totalSavings.toFixed(2)}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          That's {tunaCans} cans of premium tuna! 🐟
        </div>
      </div>
    </div>
  );
}
