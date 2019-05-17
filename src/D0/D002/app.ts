import { Rekognition, S3 } from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';
import * as uuid from 'uuid';
import * as moment from 'moment';
import { Result } from './index';

// Rekognition
let rekognitionClient: Rekognition;
// S3
let s3Client: S3;

/** S3_BUCKET */
const bucket = process.env.IMAGE_BUCKET as string;
/** 除外文字列 */
const excludeWord = process.env.EXCLUDE_WORD
  ? process.env.EXCLUDE_WORD.split(',')
  : [];
/** 除外記号 */
const excludeMark = process.env.EXCLUDE_MARK
  ? process.env.EXCLUDE_MARK.split(',')
  : [];

const excludeId: number[] = [];

export const app = async (event: APIGatewayEvent): Promise<Result> => {
  if (!event.body) {
    return (undefined as unknown) as Result;
  }

  // save data in s3
  const params = {
    Bucket: bucket,
    Key: `${moment().format('YYYYMMDD')}/${uuid.v4()}`,
    ContentType: 'image/jpeg',
    Body: new Buffer(event.body, 'base64')
  };

  // S3 Client初期化
  if (!s3Client) {
    s3Client = new S3({
      region: process.env.AWS_REGION
    });
  }

  // S3に保存する
  await s3Client.putObject(params).promise();

  const request: Rekognition.Types.DetectTextRequest = {
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: params.Key
      }
    }
  };

  // S3 Client初期化
  if (!rekognitionClient) {
    rekognitionClient = new Rekognition({
      region: process.env.AWS_REGION
    });
  }

  const result = await rekognitionClient.detectText(request).promise();

  // 認識結果なし
  if (!result.TextDetections) {
    return {
      words: []
    };
  }

  const results: string[] = [];

  result.TextDetections.forEach(item => {
    // 文字列検索できない
    if (!item.DetectedText) return;
    // 対象外を除く
    if (!filter(item)) return;

    results.push(item.DetectedText);
  });

  // 重複結果を削除してから返却する
  return {
    words: Array.from(new Set(results))
  };
};

// 単語以外のデータを除く
const filter = (item: Rekognition.TextDetection): boolean => {
  // 確信度９０以下を除く
  if (item.Confidence && item.Confidence < 90) {
    return false;
  }
  // 必須チェック
  if (!item.DetectedText) return false;

  const text = item.DetectedText;

  // 行の場合、対象外単語を含めた場合
  if (item.Type === 'LINE') {
    if (excludeWord.find(word => text.includes(word))) {
      if (item.Id !== undefined) {
        excludeId.push(item.Id);
      }

      return false;
    }
  }

  // 対象外のLineの子供も対象外
  if (item.ParentId !== undefined && excludeId.includes(item.ParentId)) {
    return false;
  }

  // 2桁以下の対象外
  if (text.length <= 2) return false;

  // 記号を含むのは単語ではない
  const target = excludeMark.find(mark => text.indexOf(mark) !== -1);
  // 記号がある場合
  if (target) return false;

  return true;
};