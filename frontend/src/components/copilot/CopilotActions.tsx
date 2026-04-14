import { useCopilotAction, useCopilotChatSuggestions } from '@copilotkit/react-core';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../../api/config';
import PriceChart from './actions/PriceChart';
import SupplierReportCard from './actions/SupplierReportCard';
import DealFinder from './actions/DealFinder';
import OrderPipeline from './actions/OrderPipeline';

const apiGet = async (endpoint: string) => {
  const { data } = await axios.get(`${api.baseURL}${endpoint}`);
  return data;
};

// Self-loading wrapper components that fetch data on mount
// This avoids async handlers which cause "RUN_FINISHED while tool calls active" errors

function LoadingIndicator({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-gray-900 p-4 text-white text-sm animate-pulse">
      {message}
    </div>
  );
}

function ErrorIndicator({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-gray-900 p-4 text-red-400 text-sm">
      {message}
    </div>
  );
}

function PriceChartLoader({ sortBy }: { sortBy?: string }) {
  const [products, setProducts] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiGet(api.endpoints.products).then(setProducts).catch(() => setError(true));
  }, []);
  if (error) return <ErrorIndicator message="Failed to load product prices." />;
  if (!products) return <LoadingIndicator message="📊 Fetching product prices..." />;
  return <PriceChart products={products} sortBy={sortBy} />;
}

function SupplierReportCardLoader() {
  const [data, setData] = useState<{ suppliers: any[]; products: any[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    Promise.all([apiGet(api.endpoints.suppliers), apiGet(api.endpoints.products)])
      .then(([suppliers, products]) => setData({ suppliers, products }))
      .catch(() => setError(true));
  }, []);
  if (error) return <ErrorIndicator message="Failed to load supplier data." />;
  if (!data) return <LoadingIndicator message="🏪 Loading supplier report cards..." />;
  return <SupplierReportCard suppliers={data.suppliers} products={data.products} />;
}

function DealFinderLoader() {
  const [products, setProducts] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiGet(api.endpoints.products).then(setProducts).catch(() => setError(true));
  }, []);
  if (error) return <ErrorIndicator message="Failed to load deals." />;
  if (!products) return <LoadingIndicator message="🏷️ Sniffing out the best deals..." />;
  return <DealFinder products={products} />;
}

function OrderPipelineLoader() {
  const [data, setData] = useState<{ orders: any[]; branches: any[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    Promise.all([apiGet(api.endpoints.orders), apiGet(api.endpoints.branches)])
      .then(([orders, branches]) => setData({ orders, branches }))
      .catch(() => setError(true));
  }, []);
  if (error) return <ErrorIndicator message="Failed to load order pipeline." />;
  if (!data) return <LoadingIndicator message="📦 Loading order pipeline..." />;
  return <OrderPipeline orders={data.orders} branches={data.branches} />;
}

export default function CopilotActions() {
  // --- Chat Suggestions (static to avoid repeated backend calls) ---
  useCopilotChatSuggestions({
    available: 'always',
    suggestions: [
      { title: 'Show me a purr-ice comparison', message: 'Show me a price comparison of all products' },
      { title: 'Find the best deals right meow', message: 'Find me the best deals and discounts' },
      { title: 'Compare our suppliers', message: 'Compare all suppliers and show their report cards' },
    ],
  });

  // --- Action: Show Product Price Chart ---
  useCopilotAction({
    name: 'showProductPriceChart',
    description:
      'Show an interactive price chart comparing all products. Use when the user asks about prices, product comparison, or wants to see a price overview.',
    parameters: [
      {
        name: 'sortBy',
        type: 'string',
        description: 'How to sort: price_asc, price_desc, or discount',
        required: false,
      },
    ],
    handler: async () => {
      // No-op: data fetching happens in the render component
    },
    render: (props) => {
      if (props.status !== 'complete') {
        return <LoadingIndicator message="📊 Fetching product prices..." />;
      }
      const sortBy = props.args?.sortBy;
      return <PriceChartLoader sortBy={sortBy} />;
    },
  });

  // --- Action: Show Supplier Report Cards ---
  useCopilotAction({
    name: 'showSupplierReportCard',
    description:
      'Show supplier report cards with ratings, product counts, and deal information. Use when the user asks about suppliers, vendor comparison, or supplier details.',
    parameters: [],
    handler: async () => {},
    render: (props) => {
      if (props.status !== 'complete') {
        return <LoadingIndicator message="🏪 Loading supplier report cards..." />;
      }
      return <SupplierReportCardLoader />;
    },
  });

  // --- Action: Show Deal Finder ---
  useCopilotAction({
    name: 'showDealFinder',
    description:
      'Show the best deals and discounts on products. Use when the user asks about deals, discounts, savings, or bargains.',
    parameters: [],
    handler: async () => {},
    render: (props) => {
      if (props.status !== 'complete') {
        return <LoadingIndicator message="🏷️ Sniffing out the best deals..." />;
      }
      return <DealFinderLoader />;
    },
  });

  // --- Action: Show Order Pipeline ---
  useCopilotAction({
    name: 'showOrderPipeline',
    description:
      'Show the order pipeline with status lanes and progress tracking. Use when the user asks about order status, tracking, pipeline, or delivery progress.',
    parameters: [],
    handler: async () => {},
    render: (props) => {
      if (props.status !== 'complete') {
        return <LoadingIndicator message="📦 Loading order pipeline..." />;
      }
      return <OrderPipelineLoader />;
    },
  });

  return null;
}
