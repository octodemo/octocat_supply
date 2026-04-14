import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  // Add other fields as needed
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: number }
  | { type: 'UPDATE_QUANTITY'; productId: number; quantity: number }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.product.productId === action.product.productId);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.product.productId === action.product.productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      } else {
        return {
          ...state,
          items: [...state.items, { product: action.product, quantity: 1 }],
        };
      }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.product.productId !== action.productId),
      };
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.product.productId !== action.productId),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.product.productId === action.productId
            ? { ...item, quantity: action.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
} | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = (product: Product) => dispatch({ type: 'ADD_ITEM', product });
  const removeItem = (productId: number) => dispatch({ type: 'REMOVE_ITEM', productId });
  const updateQuantity = (productId: number, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const getTotalItems = () => state.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};