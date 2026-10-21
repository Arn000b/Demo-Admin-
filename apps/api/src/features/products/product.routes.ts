import { Hono } from 'hono';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  type AuthEnv,
} from '../../middleware/auth.middleware';
import type { AuthService } from '../auth/auth.types';
import type { CatalogService } from '../catalog/catalog.service';
import { ProductController } from './product.controller';

export function createProductRoutes(catalogService: CatalogService, authService: AuthService) {
  const router = new Hono<AuthEnv>();
  const controller = new ProductController(catalogService);
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const optionalAuth = createOptionalAuthMiddleware((token) => authService.resolveSession(token));

  router.get('/', optionalAuth as never, controller.listProducts);
  router.get('/:id', optionalAuth as never, controller.getProduct);
  router.post('/', auth, controller.createProduct);
  router.patch('/:id', auth, controller.updateProduct);
  router.delete('/:id', auth, controller.deleteProduct);

  router.get('/:id/variants', optionalAuth as never, controller.listVariants);
  router.post('/:id/variants', auth, controller.createVariant);

  return router;
}
