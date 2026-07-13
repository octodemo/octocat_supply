import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

const STORAGE_TOKEN_KEY = 'wishlist_token';

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

interface WishlistItem {
  wishlistItemId: number;
  productId: number;
  addedAt: string;
  product: Product;
}

interface WishlistData {
  wishlistId: number;
  shareToken: string;
  createdAt: string;
  items: WishlistItem[];
}

const fetchWishlist = async (token: string): Promise<WishlistData> => {
  const { data } = await axios.get<WishlistData>(`${api.baseURL}${api.endpoints.wishlists}/${token}`);
  return data;
};

export default function Wishlist() {
  const { token } = useParams<{ token: string }>();
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const isOwner = token !== undefined && localStorage.getItem(STORAGE_TOKEN_KEY) === token;

  const { data: wishlist, isLoading, error } = useQuery(
    ['wishlist', token],
    () => fetchWishlist(token!),
    { enabled: token !== undefined },
  );

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (productId: number) => {
    if (!token) return;
    setRemovingId(productId);
    try {
      await axios.delete(`${api.baseURL}${api.endpoints.wishlists}/${token}/items/${productId}`);
      // Update localStorage item cache
      try {
        const stored = JSON.parse(localStorage.getItem('wishlist_items') ?? '[]') as number[];
        localStorage.setItem('wishlist_items', JSON.stringify(stored.filter((id) => id !== productId)));
      } catch {
        // ignore localStorage errors
      }
      await queryClient.invalidateQueries(['wishlist', token]);
    } catch (err) {
      console.error('Failed to remove item', err);
    } finally {
      setRemovingId(null);
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={darkMode ? 'text-light' : 'text-gray-800'}>Invalid wishlist link.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4`}>
        <div className="max-w-4xl mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error || !wishlist) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-500">Wishlist not found.</p>
          <Link to="/products" className="mt-4 inline-block text-primary hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Wishlist
          </h1>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Link
                to="/products"
                className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-200 text-sm"
              >
                + Add products
              </Link>
            )}
            <button
              onClick={handleCopyLink}
              aria-label="Copy wishlist link to clipboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-accent transition-colors duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Share link'}
            </button>
          </div>
        </div>

        {wishlist.items.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-20 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
            role="status"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-12 w-12 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className={`text-lg font-medium ${darkMode ? 'text-light' : 'text-gray-800'}`}>
              This wishlist is empty
            </p>
            {isOwner && (
              <Link to="/products" className="mt-3 text-primary hover:underline text-sm">
                Browse products to add some
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-4" aria-label="Wishlist items">
            {wishlist.items.map((item) => {
              const { product } = item;
              const hasDiscount = product.discount != null && product.discount > 0;
              return (
                <li
                  key={item.wishlistItemId}
                  className={`flex items-center gap-4 p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}
                >
                  <img
                    src={`/${product.imgName}`}
                    alt={product.name}
                    className="w-16 h-16 object-contain rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className={`font-semibold truncate ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                      {product.name}
                    </h2>
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.description}
                    </p>
                    <div className="mt-1">
                      {hasDiscount ? (
                        <span>
                          <span className="text-gray-400 line-through text-sm mr-2">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-primary font-bold">
                            ${(product.price * (1 - product.discount!)).toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-primary font-bold">${product.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(product.productId)}
                      disabled={removingId === product.productId}
                      aria-label={`Remove ${product.name} from wishlist`}
                      className={`shrink-0 p-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                        ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}
                        ${removingId === product.productId ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
