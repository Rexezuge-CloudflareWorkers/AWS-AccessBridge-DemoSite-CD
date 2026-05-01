import { FederateRoute } from '@/endpoints/api/aws/federate/GET';
import type { RouteOptions } from 'chanfana';

class FederateWrapperRoute extends FederateRoute {
  constructor(params: RouteOptions) {
    super(params);
    this.schema = {
      ...this.schema,
      summary: 'Federate AWS Access (Alias)',
      description: 'Alias for /api/aws/federate - Assumes an AWS role and generates a console URL in a single request.',
    };
  }
}

export { FederateWrapperRoute };
