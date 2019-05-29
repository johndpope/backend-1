import { app } from './app';
import { APIGatewayEvent, Callback } from 'aws-lambda';

// イベント入口
export const handler = (
  event: APIGatewayEvent,
  _: any,
  callback: Callback<Response>
) => {
  // イベントログ
  console.log(event);

  app(event)
    .then((result: ResponseBody[]) => {
      // 終了ログ
      console.log(result);
      callback(null, {
        statusCode: 200,
        isBase64Encoded: false,
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(result)
      });
    })
    .catch(err => {
      // エラーログ
      console.log(err);
      callback(err, {
        statusCode: 502,
        isBase64Encoded: false,
        headers: {
          'content-type': 'application/json'
        }
      } as Response);
    });
};

export interface Response {
  statusCode: number;
  headers?: {
    [key: string]: string;
  };
  isBase64Encoded: boolean;
  body?: string;
}

export interface RequestBody {
  words: string[];
}

export interface ResponseBody {
  word: string;
}
