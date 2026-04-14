import { useState, useDeferredValue } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  discount?: number;
}

type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | '';

interface SearchParams {
  q: string;
  minPrice: string;
  maxPrice: string;
  sortBy: SortOption;
}

const fetchFilteredProducts = async (params: SearchParams): Promise<Product[]> => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.minPrice) query.set('minPrice', params.minPrice);
  if (params.maxPrice) query.set('maxPrice', params.maxPrice);
  if (params.sortBy) query.set('sortBy', params.sortBy);

  const queryString = query.toString();
  const url = queryString
    ? `${api.baseURL}${api.endpoints.productsSearch}?${queryString}`
    : `${api.baseURL}${api.endpoints.products}`;

  const { data } = await axios.get(url);
  return data;
};

export default function Products() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { darkMode } = useTheme();

  const deferredSearch = useDeferredValue(searchTerm);
  const deferredMinPrice = useDeferredValue(minPrice);
  const deferredMaxPrice = useDeferredValue(maxPrice);

  const searchParams: SearchParams = {
    q: deferredSearch,
    minPrice: deferredMinPrice,
    maxPrice: deferredMaxPrice,
    sortBy,
  };

  const { data: filteredProducts, isLoading, error } = useQuery(
    ['products', searchParams],
    () => fetchFilteredProducts(searchParams),
  );

  const isStale = searchTerm !== deferredSearch || minPrice !== deferredMinPrice || maxPrice !== deferredMaxPrice;

  const hasActiveFilters = minPrice !== '' || maxPrice !== '' || sortBy !== '';

  const handleQuantityChange = (productId: number, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change),
    }));
  };

  const handleAddToCart = (productId: number) => {
    const quantity = quantities[productId] || 0;
    if (quantity > 0) {
      // TODO: Implement cart functionality
      alert(`Added ${quantity} items to cart`);
      setQuantities((prev) => ({
        ...prev,
        [productId]: 0,
      }));
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center">Failed to fetch products</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <h1
            className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} transition-colors duration-300`}
          >
            Products
          </h1>

          <section className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-grow group">
                <svg
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:text-filter-violet transition-colors duration-200`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search for smart tech..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-200'} rounded-lg border focus:border-transparent focus:ring-2 focus:ring-filter-violet focus:outline-none transition-all duration-200 shadow-sm`}
                  aria-label="Search products"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative px-6 py-4 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                  showFilters || hasActiveFilters
                    ? 'bg-filter-violet text-white hover:opacity-90'
                    : darkMode
                      ? 'bg-gray-800 text-light border border-gray-700 hover:border-filter-violet'
                      : 'bg-white text-gray-800 border border-gray-200 hover:border-filter-violet'
                }`}
                aria-label="Toggle filters"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="absolute -top-2 -right-2 bg-filter-coral text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    !
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden relative`}
                style={{ boxShadow: '0 4px 20px rgba(139, 92, 246, 0.15)' }}>
                <div className="h-[3px] w-full bg-gradient-to-r from-filter-violet to-filter-fuchsia"></div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-3">
                    <label className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Price Range</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${darkMode ? 'bg-gray-700 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-200'} focus:ring-filter-violet focus:border-filter-violet focus:outline-none transition-all`}
                        min="0"
                        aria-label="Minimum price"
                      />
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${darkMode ? 'bg-gray-700 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-200'} focus:ring-filter-violet focus:border-filter-violet focus:outline-none transition-all`}
                        min="0"
                        aria-label="Maximum price"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${darkMode ? 'bg-gray-700 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-200'} focus:ring-filter-violet focus:border-filter-violet focus:outline-none transition-all`}
                      aria-label="Sort products"
                    >
                      <option value="">Default</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="name_asc">Name: A to Z</option>
                      <option value="name_desc">Name: Z to A</option>
                    </select>
                  </div>

                  <div></div>

                  {hasActiveFilters && (
                    <div className="flex items-end justify-end">
                      <button
                        onClick={() => { setMinPrice(''); setMaxPrice(''); setSortBy(''); }}
                        className="text-filter-coral font-bold text-sm hover:underline flex items-center gap-1 transition-all"
                        aria-label="Clear all filters"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isStale && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-gradient-to-r from-filter-violet to-filter-fuchsia animate-pulse rounded-full w-2/3"></div>
              </div>
            )}
          </section>

          {/* Empty state when no products match */}
          {(!filteredProducts || filteredProducts.length === 0) && (
            <div
              className={`flex flex-col items-center justify-center text-center py-20 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'
                } shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
              role="status"
              aria-live="polite"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-12 w-12 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h7l2 3h9v13a2 2 0 01-2 2H5a2 2 0 01-2-2V3zm3 7h12" />
              </svg>
              <p className={`${darkMode ? 'text-light' : 'text-gray-800'} text-lg font-medium`}>
                No products found
              </p>
              {searchTerm && (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                  Try clearing or changing your search filters.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts?.map((product) => {
              const hasDiscount = product.discount != null && product.discount > 0;
              return (
                <article
                  key={product.productId}
                  className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(118,184,82,0.2)] flex flex-col group`}
                >
                  <div
                    className={`relative h-56 ${darkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-gray-50 to-gray-200'} overflow-hidden cursor-pointer`}
                    onClick={() => handleProductClick(product)}
                  >
                    <img
                      src={`/${product.imgName}`}
                      alt={product.name}
                      className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                    />
                    {hasDiscount && (
                      <div className="absolute top-4 left-0 z-10 bg-primary text-white text-[10px] font-black px-4 py-1.5 uppercase tracking-widest -rotate-2 origin-left shadow-lg">
                        {Math.round(product.discount! * 100)}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3
                      className={`text-lg font-bold ${darkMode ? 'text-light' : 'text-gray-900'} mb-1`}
                    >
                      {product.name}
                    </h3>
                    <p
                      className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mb-4 flex-grow`}
                    >
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      {hasDiscount ? (
                        <div className="flex flex-col">
                          <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-xs line-through`}>
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-primary font-extrabold text-xl">
                            ${(product.price * (1 - product.discount!)).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-primary font-extrabold text-xl">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                      <div
                        className={`flex items-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-full border px-3 py-1 gap-4`}
                      >
                        <button
                          onClick={() => handleQuantityChange(product.productId, -1)}
                          className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} hover:text-primary font-bold transition-colors`}
                          aria-label={`Decrease quantity of ${product.name}`}
                          id={`decrease-qty-${product.productId}`}
                        >
                          -
                        </button>
                        <span
                          className={`text-sm font-bold w-4 text-center ${darkMode ? 'text-light' : 'text-gray-800'}`}
                          aria-label={`Quantity of ${product.name}`}
                          id={`qty-${product.productId}`}
                        >
                          {quantities[product.productId] || 0}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.productId, 1)}
                          className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} hover:text-primary font-bold transition-colors`}
                          aria-label={`Increase quantity of ${product.name}`}
                          id={`increase-qty-${product.productId}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(product.productId)}
                      className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        quantities[product.productId]
                          ? 'bg-primary text-white hover:brightness-105 active:scale-[0.98]'
                          : `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-primary/80 text-white'} cursor-default`
                      }`}
                      disabled={!quantities[product.productId]}
                      aria-label={`Add ${quantities[product.productId] || 0} ${product.name} to cart`}
                      id={`add-to-cart-${product.productId}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                      </svg>
                      Add to Cart
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && selectedProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'} transition-colors duration-300`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div
              className={`${darkMode ? 'bg-gradient-to-t from-gray-700 to-gray-800' : 'bg-gradient-to-t from-gray-100 to-white'} rounded-lg mb-6 p-4`}
            >
              <img
                src={`/${selectedProduct.imgName}`}
                alt={selectedProduct.name}
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
            <h2
              className={`text-2xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} mb-4 transition-colors duration-300`}
            >
              {selectedProduct.name}
            </h2>
            <p
              className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg transition-colors duration-300`}
            >
              {selectedProduct.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
