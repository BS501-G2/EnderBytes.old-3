import { BSON } from 'bson';

import type { Map } from '$lib/server/api';
import {
  ApiError,
  ApiErrorType,
  maxBulkRequestEntryCount,
  maxRequestSizeLimit,
  waitForNextBulkReqestTimeout
} from '$lib/shared/api';
import { clearAuthentication } from './api-functions';

export type ApiRequest<T extends keyof Map> = [name: T, ...args: Parameters<Map[T]>];
export enum ApiResponseType {
  InvalidInvocationRequest,
  InvokeSuccess,
  InvokeError
}

export type ApiResponse =
  | [type: ApiResponseType.InvokeSuccess, data: any]
  | [
      type: ApiResponseType.InvokeError,
      status: ApiErrorType,
      name: string,
      message: string,
      stack?: string
    ]
  | [
      type: ApiResponseType.InvalidInvocationRequest,
      status: ApiErrorType,
      message: string,
      stack?: string
    ];

export interface RequestData extends BSON.Document {
  data: Uint8Array[];
}

export interface ResponseData extends BSON.Document {
  data: [true, Uint8Array[]] | [false, message: string];
}

class A extends Error {}

async function bulkRequest(requests: Uint8Array[]): Promise<Uint8Array[]> {
  const requestBody = BSON.serialize({
    data: requests
  } as RequestData);

  if (requestBody.length > maxRequestSizeLimit) {
    // throw new Error('Request too large');
    throw new A();
  }

  const request = new Request('/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/bson'
    },
    body: requestBody
  });

  const { data: response } = BSON.deserialize(
    new Uint8Array(await (await fetch(request)).arrayBuffer()),
    {
      promoteBuffers: true
    }
  ) as ResponseData;

  if (response[0]) {
    return response[1];
  } else {
    throw new Error(response[1]);
  }
}

type RequestQueueEntry = [
  requestData: Uint8Array,
  resolve: (data: Uint8Array) => void,
  reject: (reason?: any) => void
];
let requestQueue: RequestQueueEntry[] = [];
let requestQueueRunning: boolean = false;
let requestQueueWaitForNextTimeout: number = 0;

export async function clientSideInvoke<T extends keyof Map>(
  name: T,
  ...args: Parameters<Map[T]>
): Promise<Awaited<ReturnType<Map[T]>>> {
  const result = BSON.deserialize(
    new Uint8Array(
      await new Promise<Uint8Array>((resolve, reject) => {
        const request: RequestQueueEntry = [
          BSON.serialize({ data: [name, ...args] as ApiRequest<T> }),
          resolve,
          reject
        ];

        bulkRequest([request[0]]).then((responses) => resolve(responses[0]), reject);
      })
    ),
    {
      promoteBuffers: true
    }
  ).data as ApiResponse;

  if (result[0] === ApiResponseType.InvokeError) {
    const error = Object.assign(new ApiError(result[1], result[2], { stack: result[3] }), {
      name: ApiResponseType[result[0]]
    });

    if (error.status === ApiErrorType.Unauthorized) {
      clearAuthentication();
    }

    throw error;
  } else if (result[0] === ApiResponseType.InvalidInvocationRequest) {
    throw new ApiError(result[1], result[2], { stack: result[3] });
  } else {
    return result[1];
  }
}
