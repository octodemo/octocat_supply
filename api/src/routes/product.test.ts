import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

const seedProducts = async () => {
  const db = await getDatabase();
  await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier A']);
  await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [2, 'Supplier B']);
  await db.run(
    'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [1, 1, 'SmartFeeder One', 'AI-powered cat feeder', 129.99, 'CAT-FEED-001', 'piece', 'feeder.png'],
  );
  await db.run(
    'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [2, 1, 'WhiskerCam Pro', 'Night vision cat camera', 149.99, 'CAT-CAM-001', 'piece', 'camera.png'],
  );
  await db.run(
    'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [3, 2, 'CatFlix Portal', 'Entertainment system for cats', 89.99, 'CAT-FLIX-001', 'piece', 'catflix.png'],
  );
};

describe('Product Search API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);
    await seedProducts();

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should return all products when no filters are provided', async () => {
    const response = await request(app).get('/products/search');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  it('should filter products by text search on name', async () => {
    const response = await request(app).get('/products/search?q=whisker');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('WhiskerCam Pro');
  });

  it('should filter products by text search on description', async () => {
    const response = await request(app).get('/products/search?q=entertainment');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('CatFlix Portal');
  });

  it('should filter products by minimum price', async () => {
    const response = await request(app).get('/products/search?minPrice=100');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    response.body.forEach((p: { price: number }) => {
      expect(p.price).toBeGreaterThanOrEqual(100);
    });
  });

  it('should filter products by maximum price', async () => {
    const response = await request(app).get('/products/search?maxPrice=100');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('CatFlix Portal');
  });

  it('should filter products by price range', async () => {
    const response = await request(app).get('/products/search?minPrice=100&maxPrice=140');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('SmartFeeder One');
  });

  it('should filter products by supplier ID', async () => {
    const response = await request(app).get('/products/search?supplierId=2');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('CatFlix Portal');
  });

  it('should sort products by price ascending', async () => {
    const response = await request(app).get('/products/search?sortBy=price_asc');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0].price).toBe(89.99);
    expect(response.body[2].price).toBe(149.99);
  });

  it('should sort products by price descending', async () => {
    const response = await request(app).get('/products/search?sortBy=price_desc');
    expect(response.status).toBe(200);
    expect(response.body[0].price).toBe(149.99);
    expect(response.body[2].price).toBe(89.99);
  });

  it('should sort products by name ascending', async () => {
    const response = await request(app).get('/products/search?sortBy=name_asc');
    expect(response.status).toBe(200);
    expect(response.body[0].name).toBe('CatFlix Portal');
    expect(response.body[2].name).toBe('WhiskerCam Pro');
  });

  it('should sort products by name descending', async () => {
    const response = await request(app).get('/products/search?sortBy=name_desc');
    expect(response.status).toBe(200);
    expect(response.body[0].name).toBe('WhiskerCam Pro');
    expect(response.body[2].name).toBe('CatFlix Portal');
  });

  it('should combine text search with price filter and sorting', async () => {
    const response = await request(app).get('/products/search?q=whisker&minPrice=100&sortBy=price_asc');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('WhiskerCam Pro');
  });

  it('should return empty array when no products match', async () => {
    const response = await request(app).get('/products/search?q=nonexistent');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });
});
