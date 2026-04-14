import { useCart, CartItem } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';

export default function Cart() {
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const { darkMode } = useTheme();

  const totalPrice = state.items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  if (state.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
          Shopping Cart
        </h1>
        <div className={`text-center py-12 ${darkMode ? 'text-light' : 'text-gray-600'}`}>
          <svg
            className="mx-auto h-24 w-24 mb-4 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h10a2 2 0 002-2v-3"
            />
          </svg>
          <p className="text-xl">Your cart is empty</p>
          <p className="mt-2">Add some products to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
          Shopping Cart
        </h1>
        <button
          onClick={clearCart}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="space-y-4">
        {state.items.map((item: CartItem) => (
          <div
            key={item.product.productId}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              darkMode ? 'bg-dark border-gray-600' : 'bg-white border-gray-200'
            } shadow-sm`}
          >
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                {item.product.name}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                {item.product.description}
              </p>
              <p className={`text-lg font-bold text-primary mt-2`}>
                ${item.product.price.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor={`quantity-${item.product.productId}`}
                  className={`text-sm ${darkMode ? 'text-light' : 'text-gray-700'}`}
                >
                  Quantity:
                </label>
                <input
                  id={`quantity-${item.product.productId}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.product.productId, parseInt(e.target.value) || 0)}
                  className={`w-16 px-2 py-1 border rounded-md text-center ${
                    darkMode
                      ? 'bg-dark border-gray-600 text-light'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
              </div>

              <p className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                ${(item.product.price * item.quantity).toFixed(2)}
              </p>

              <button
                onClick={() => removeItem(item.product.productId)}
                className="text-red-500 hover:text-red-700 transition-colors"
                aria-label={`Remove ${item.product.name} from cart`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-8 p-6 rounded-lg border ${
          darkMode ? 'bg-dark border-gray-600' : 'bg-white border-gray-200'
        } shadow-sm`}
      >
        <div className="flex justify-between items-center">
          <span className={`text-xl font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Total: ${totalPrice.toFixed(2)}
          </span>
          <Link
            to="/checkout"
            className="bg-primary hover:bg-accent text-white px-6 py-3 rounded-md text-lg font-medium transition-colors"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}