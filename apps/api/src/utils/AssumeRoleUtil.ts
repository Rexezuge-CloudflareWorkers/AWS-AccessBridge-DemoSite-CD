import { AwsClient } from 'aws4fetch';
import { AccessKeys, AccessKeysWithExpiration } from '@/model';
import { InternalServerError, UnauthorizedError } from '@/error';
import { ASSUME_ROLE_UTIL_ERROR_STS_CALL, ASSUME_ROLE_UTIL_ERROR_STS_RESPONSE_PARSE } from '@/constants';

class AssumeRoleUtil {
  public static async assumeRole(
    roleArn: string,
    accessKeys: AccessKeys,
    sessionName: string,
    region: string = 'us-east-1',
  ): Promise<AccessKeysWithExpiration> {
    const stsClient: AwsClient = new AwsClient({
      service: 'sts',
      region: region,
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const queryParams: URLSearchParams = new URLSearchParams({
      Action: 'AssumeRole',
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      DurationSeconds: accessKeys.sessionToken ? '3600' : '43200',
      Version: '2011-06-15',
    });

    const url: string = `https://sts.${region}.amazonaws.com/?${queryParams.toString()}`;

    const response: Response = await stsClient.fetch(url, { method: 'POST' });
    const xmlText: string = await response.text();

    if (!response.ok) {
      console.error(`STS AssumeRole failed: ${response.status} ${response.statusText}\n${xmlText}`);
      throw new UnauthorizedError(ASSUME_ROLE_UTIL_ERROR_STS_CALL);
    }

    const accessKeyIdMatch: RegExpMatchArray | null = xmlText.match(/<AccessKeyId>([^<]+)<\/AccessKeyId>/);
    const secretAccessKeyMatch: RegExpMatchArray | null = xmlText.match(/<SecretAccessKey>([^<]+)<\/SecretAccessKey>/);
    const sessionTokenMatch: RegExpMatchArray | null = xmlText.match(/<SessionToken>([^<]+)<\/SessionToken>/);
    const expirationMatch: RegExpMatchArray | null = xmlText.match(/<Expiration>([^<]+)<\/Expiration>/);

    if (!accessKeyIdMatch || !secretAccessKeyMatch || !sessionTokenMatch || !expirationMatch) {
      throw new InternalServerError(ASSUME_ROLE_UTIL_ERROR_STS_RESPONSE_PARSE);
    }

    return {
      accessKeyId: accessKeyIdMatch[1],
      secretAccessKey: secretAccessKeyMatch[1],
      sessionToken: sessionTokenMatch[1],
      expiration: expirationMatch[1],
    };
  }
}

export { AssumeRoleUtil };
