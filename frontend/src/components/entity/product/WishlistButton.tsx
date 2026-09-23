import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

const STORAGE_TOKEN_KEY = 'wishlist_token';
const STORAGE_ITEMS_KEY = 'wishlist_items';

function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function getStoredItems(): number[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) ?? '[]') as number[];
  } catch {
    return [];
  }
}

function setStoredItems(items: number[]): void {
  localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
}

interface WishlistButtonProps {
  productId: number;
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const { darkMode } = useTheme();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsInWishlist(getStoredItems().includes(productId));
  }, [productId]);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      let token = getStoredToken();

      if (!token) {
        // Create a new wishlist on first use
        const { data } = await axios.post<{ shareToken: string }>(
          `${api.baseURL}${api.endpoints.wishlists}`,
        );
        token = data.shareToken;
        localStorage.setItem(STORAGE_TOKEN_KEY, token);
        setStoredItems([]);
        // Notify other components (e.g. Navigation) that the token was created
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_TOKEN_KEY, newValue: token }));
      }

      if (isInWishlist) {
        await axios.delete(`${api.baseURL}${api.endpoints.wishlists}/${token}/items/${productId}`);
        const updated = getStoredItems().filter((id) => id !== productId);
        setStoredItems(updated);
        setIsInWishlist(false);
      } else {
        await axios.post(`${api.baseURL}${api.endpoints.wishlists}/${token}/items`, { productId });
        const updated = [...getStoredItems(), productId];
        setStoredItems(updated);
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Wishlist action failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, isInWishlist]);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isInWishlist ? `Remove ${productId} from wishlist` : `Add ${productId} to wishlist`}
      aria-pressed={isInWishlist}
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isInWishlist
          ? 'text-red-500 hover:text-red-400'
          : darkMode
          ? 'text-gray-400 hover:text-red-400'
          : 'text-gray-400 hover:text-red-500'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isInWishlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}
