import { AwsClient } from 'aws4fetch';
import { BadRequestError, InternalServerError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class ValidateCredentialsRoute extends IAdminActivityAPIRoute<
  ValidateCredentialsRequest,
  ValidateCredentialsResponse,
  ValidateCredentialsEnv
> {
  schema = {
    tags: ['Admin'],
    summary: 'Validate AWS Credentials',
    description:
      'Validates AWS credentials by calling STS GetCallerIdentity. Does not store the credentials — only verifies they work and returns the identity information.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['accessKeyId', 'secretAccessKey'],
            properties: {
              accessKeyId: { type: 'string' as const, description: 'AWS Access Key ID' },
              secretAccessKey: { type: 'string' as const, description: 'AWS Secret Access Key' },
              sessionToken: { type: 'string' as const, description: 'AWS Session Token (optional)' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Credentials are valid',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                valid: { type: 'boolean' as const },
                arn: { type: 'string' as const },
                accountId: { type: 'string' as const },
                userId: { type: 'string' as const },
              },
            },
          },
        },
      },
    },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: ValidateCredentialsRequest,
    _env: ValidateCredentialsEnv,
    _cxt: ActivityContext<ValidateCredentialsEnv>,
  ): Promise<ValidateCredentialsResponse> {
    if (!request.accessKeyId || !request.secretAccessKey) {
      throw new BadRequestError('Missing required fields: accessKeyId and secretAccessKey.');
    }

    const stsClient: AwsClient = new AwsClient({
      service: 'sts',
      region: 'us-east-1',
      accessKeyId: request.accessKeyId,
      secretAccessKey: request.secretAccessKey,
      sessionToken: request.sessionToken,
    });

    const queryParams: URLSearchParams = new URLSearchParams({
      Action: 'GetCallerIdentity',
      Version: '2011-06-15',
    });

    const url: string = `https://sts.us-east-1.amazonaws.com/?${queryParams.toString()}`;

    try {
      const response: Response = await stsClient.fetch(url, { method: 'POST' });
      const xmlText: string = await response.text();

      if (!response.ok) {
        throw new BadRequestError(`AWS credentials are invalid: ${response.status} ${response.statusText}`);
      }

      const arnMatch: RegExpMatchArray | null = xmlText.match(/<Arn>([^<]+)<\/Arn>/);
      const accountMatch: RegExpMatchArray | null = xmlText.match(/<Account>([^<]+)<\/Account>/);
      const userIdMatch: RegExpMatchArray | null = xmlText.match(/<UserId>([^<]+)<\/UserId>/);

      if (!arnMatch || !accountMatch || !userIdMatch) {
        throw new InternalServerError('Failed to parse STS GetCallerIdentity response.');
      }

      return {
        valid: true,
        arn: arnMatch[1],
        accountId: accountMatch[1],
        userId: userIdMatch[1],
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestError || error instanceof InternalServerError) {
        throw error;
      }
      throw new BadRequestError(
        `Failed to validate credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

interface ValidateCredentialsRequest extends IRequest {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string | undefined;
}

interface ValidateCredentialsResponse extends IResponse {
  valid: boolean;
  arn: string;
  accountId: string;
  userId: string;
}

type ValidateCredentialsEnv = IAdminEnv;

export { ValidateCredentialsRoute };
