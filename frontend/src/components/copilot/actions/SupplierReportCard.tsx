interface Product {
  productId: number;
  supplierId: number;
  price: number;
  discount?: number;
}

interface Supplier {
  supplierId: number;
  name: string;
  contactPerson: string;
  active: boolean;
  verified: boolean;
}

interface SupplierReportCardProps {
  suppliers: Supplier[];
  products: Product[];
}

function getPawRating(supplier: Supplier, productCount: number, hasDeal: boolean): number {
  let rating = 0;
  if (supplier.active) rating += 2;
  if (supplier.verified) rating += 1;
  if (productCount >= 3) rating += 1;
  if (hasDeal) rating += 1;
  return rating;
}

export default function SupplierReportCard({ suppliers, products }: SupplierReportCardProps) {
  return (
    <div className="rounded-lg bg-gray-900 p-4 text-white text-sm w-full max-w-md">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>🏪</span> Supplier Report Cards
      </h3>
      <div className="space-y-3">
        {suppliers.map((supplier) => {
          const supplierProducts = products.filter((p) => p.supplierId === supplier.supplierId);
          const avgPrice =
            supplierProducts.length > 0
              ? supplierProducts.reduce((s, p) => s + p.price, 0) / supplierProducts.length
              : 0;
          const dealsCount = supplierProducts.filter((p) => p.discount && p.discount > 0).length;
          const hasDeal = dealsCount > 0;
          const pawRating = getPawRating(supplier, supplierProducts.length, hasDeal);

          return (
            <div key={supplier.supplierId} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">{supplier.name}</span>
                <span className="text-base" title={`${pawRating}/5 paws`}>
                  {'🐾'.repeat(pawRating)}
                  {'⬜'.repeat(5 - pawRating)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                <div className="bg-gray-700 rounded p-1.5">
                  <div className="text-lg font-bold text-green-400">{supplierProducts.length}</div>
                  <div className="text-[10px] text-gray-400">Products</div>
                </div>
                <div className="bg-gray-700 rounded p-1.5">
                  <div className="text-lg font-bold text-blue-400">${avgPrice.toFixed(0)}</div>
                  <div className="text-[10px] text-gray-400">Avg Price</div>
                </div>
                <div className="bg-gray-700 rounded p-1.5">
                  <div className="text-lg font-bold text-yellow-400">{dealsCount}</div>
                  <div className="text-[10px] text-gray-400">Deals</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${supplier.active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {supplier.active ? 'Active' : 'Inactive'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${supplier.verified ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                >
                  {supplier.verified ? 'Verified' : 'Unverified'}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  Contact: {supplier.contactPerson}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
