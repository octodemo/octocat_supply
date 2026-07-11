import swaggerJsdoc from 'swagger-jsdoc';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { swaggerOptions } from './swagger-options';

const swaggerSpec = swaggerJsdoc(swaggerOptions);
const outputPath = resolve(__dirname, '..', 'api-swagger.json');

writeFileSync(outputPath, `${JSON.stringify(swaggerSpec, null, 4)}\n`);
console.log(`Swagger spec written to ${outputPath}`);