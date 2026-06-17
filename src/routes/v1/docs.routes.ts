import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerDefinition from '../../docs/swaggerDef.js';

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

/**
 * @swagger
 * tags:
 *   name: Documentation
 *   description: API documentation endpoints
 */

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, {
    explorer: true,
    // Set the protocol to HTTP
    swaggerOptions: {
      protocols: ['http'],
    },
  })
);

export default router;
