import { AwsClient } from 'aws4fetch';
import { AccessKeys } from '@/model';
import { InternalServerError } from '@/error';

interface CostExplorerResult {
  accountId: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  currency: string;
  serviceBreakdown: Record<string, number>;
}

class AwsApiUtil {
  public static async getCostAndUsage(
    accessKeys: AccessKeys,
    startDate: string,
    endDate: string,
    granularity: 'DAILY' | 'MONTHLY' = 'DAILY',
    region: string = 'us-east-1',
  ): Promise<CostExplorerResult[]> {
    const client: AwsClient = new AwsClient({
      service: 'ce',
      region: region,
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const body = JSON.stringify({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: granularity,
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const response: Response = await client.fetch(`https://ce.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSInsightsIndexService.GetCostAndUsage',
      },
      body,
    });

    const responseText: string = await response.text();

    if (!response.ok) {
      console.error(`Cost Explorer API failed: ${response.status}\n${responseText}`);
      throw new InternalServerError(`Cost Explorer API failed: ${response.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(responseText);
    const results: CostExplorerResult[] = [];

    for (const result of data.ResultsByTime || []) {
      const serviceBreakdown: Record<string, number> = {};
      let totalCost: number = 0;
      let currency: string = 'USD';

      for (const group of result.Groups || []) {
        const serviceName: string = group.Keys?.[0] || 'Unknown';
        const amount: number = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        currency = group.Metrics?.UnblendedCost?.Unit || 'USD';
        if (amount > 0) {
          serviceBreakdown[serviceName] = amount;
          totalCost += amount;
        }
      }

      results.push({
        accountId: '',
        periodStart: result.TimePeriod?.Start || startDate,
        periodEnd: result.TimePeriod?.End || endDate,
        totalCost: Math.round(totalCost * 100) / 100,
        currency,
        serviceBreakdown,
      });
    }

    return results;
  }

  public static async describeInstances(accessKeys: AccessKeys, region: string = 'us-east-1'): Promise<ResourceDiscoveryItem[]> {
    const client: AwsClient = new AwsClient({
      service: 'ec2',
      region,
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const params: URLSearchParams = new URLSearchParams({ Action: 'DescribeInstances', Version: '2016-11-15' });
    const response: Response = await client.fetch(`https://ec2.${region}.amazonaws.com/?${params.toString()}`);
    const xmlText: string = await response.text();

    if (!response.ok) {
      console.error(`EC2 DescribeInstances failed: ${response.status}`);
      return [];
    }

    const items: ResourceDiscoveryItem[] = [];
    const instanceRegex = /<instanceId>([^<]+)<\/instanceId>/g;
    const stateRegex = /<name>([^<]+)<\/name>/g;
    const nameTagRegex = /<key>Name<\/key>\s*<value>([^<]*)<\/value>/g;

    let match: RegExpExecArray | null;
    const instanceIds: string[] = [];
    while ((match = instanceRegex.exec(xmlText)) !== null) instanceIds.push(match[1]);

    const states: string[] = [];
    while ((match = stateRegex.exec(xmlText)) !== null) states.push(match[1]);

    const names: string[] = [];
    while ((match = nameTagRegex.exec(xmlText)) !== null) names.push(match[1]);

    for (let i = 0; i < instanceIds.length; i++) {
      items.push({
        resourceType: 'ec2',
        resourceId: instanceIds[i],
        resourceName: names[i] || instanceIds[i],
        state: states[i] || 'unknown',
        region,
        metadata: {},
      });
    }

    return items;
  }

  public static async listBuckets(accessKeys: AccessKeys): Promise<ResourceDiscoveryItem[]> {
    const client: AwsClient = new AwsClient({
      service: 's3',
      region: 'us-east-1',
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const response: Response = await client.fetch('https://s3.amazonaws.com/');
    const xmlText: string = await response.text();

    if (!response.ok) {
      console.error(`S3 ListBuckets failed: ${response.status}`);
      return [];
    }

    const items: ResourceDiscoveryItem[] = [];
    const nameRegex = /<Name>([^<]+)<\/Name>/g;
    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(xmlText)) !== null) {
      items.push({
        resourceType: 's3',
        resourceId: match[1],
        resourceName: match[1],
        state: 'active',
        region: 'global',
        metadata: {},
      });
    }

    return items;
  }

  public static async listFunctions(accessKeys: AccessKeys, region: string = 'us-east-1'): Promise<ResourceDiscoveryItem[]> {
    const client: AwsClient = new AwsClient({
      service: 'lambda',
      region,
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const response: Response = await client.fetch(`https://lambda.${region}.amazonaws.com/2015-03-31/functions`);

    if (!response.ok) {
      console.error(`Lambda ListFunctions failed: ${response.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const items: ResourceDiscoveryItem[] = [];

    for (const fn of data.Functions || []) {
      items.push({
        resourceType: 'lambda',
        resourceId: fn.FunctionArn || fn.FunctionName,
        resourceName: fn.FunctionName,
        state: fn.State || 'Active',
        region,
        metadata: { runtime: fn.Runtime || '', memorySize: String(fn.MemorySize || '') },
      });
    }

    return items;
  }

  public static async describeDBInstances(accessKeys: AccessKeys, region: string = 'us-east-1'): Promise<ResourceDiscoveryItem[]> {
    const client: AwsClient = new AwsClient({
      service: 'rds',
      region,
      accessKeyId: accessKeys.accessKeyId,
      secretAccessKey: accessKeys.secretAccessKey,
      sessionToken: accessKeys.sessionToken,
    });

    const params: URLSearchParams = new URLSearchParams({ Action: 'DescribeDBInstances', Version: '2014-10-31' });
    const response: Response = await client.fetch(`https://rds.${region}.amazonaws.com/?${params.toString()}`);
    const xmlText: string = await response.text();

    if (!response.ok) {
      console.error(`RDS DescribeDBInstances failed: ${response.status}`);
      return [];
    }

    const items: ResourceDiscoveryItem[] = [];
    const idRegex = /<DBInstanceIdentifier>([^<]+)<\/DBInstanceIdentifier>/g;
    const statusRegex = /<DBInstanceStatus>([^<]+)<\/DBInstanceStatus>/g;
    const engineRegex = /<Engine>([^<]+)<\/Engine>/g;

    const ids: string[] = [];
    const statuses: string[] = [];
    const engines: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = idRegex.exec(xmlText)) !== null) ids.push(match[1]);
    while ((match = statusRegex.exec(xmlText)) !== null) statuses.push(match[1]);
    while ((match = engineRegex.exec(xmlText)) !== null) engines.push(match[1]);

    for (let i = 0; i < ids.length; i++) {
      items.push({
        resourceType: 'rds',
        resourceId: ids[i],
        resourceName: ids[i],
        state: statuses[i] || 'unknown',
        region,
        metadata: { engine: engines[i] || '' },
      });
    }

    return items;
  }
}

interface ResourceDiscoveryItem {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  state: string;
  region: string;
  metadata: Record<string, string>;
}

export { AwsApiUtil };
export type { CostExplorerResult, ResourceDiscoveryItem };
