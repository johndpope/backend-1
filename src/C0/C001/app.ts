import { DynamoDB, AWSError, Polly, S3, Translate } from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';
import { v4 } from 'uuid';
import moment = require('moment');
import { RequestBody } from './index';
import { dynamoDB, polly, translate, s3 } from '@utils/clientUtils';
import { putItem_groups, getItem_words, putItem_words } from './db';
import { axiosGet } from '@utils/utils';

let client: DynamoDB.DocumentClient;
let pollyClient: Polly;
let s3Client: S3;
let translateClient: Translate;

// 環境変数
const WORDS_TABLE = process.env.WORDS_TABLE as string;
const GROUPS_TABLE = process.env.GROUPS_TABLE as string;
const IPA_URL = process.env.IPA_URL as string;
const IPA_API_KEY = process.env.IPA_API_KEY as string;
const MP3_BUCKET = process.env.MP3_BUCKET as string;
const CDN_PATH = process.env.CDN_PATH as string;

export default async (event: APIGatewayEvent): Promise<void> => {
  if (!event.body || !event.pathParameters) {
    return;
  }

  const input = JSON.parse(event.body) as RequestBody;
  const groupId = event.pathParameters['groupId'];

  // DynamoDB Client 初期化
  client = dynamoDB(client);

  // グループ単語登録用タスクを作成する
  let putTasks = input.words.map(item =>
    client
      .put(
        putItem_groups(GROUPS_TABLE, {
          id: groupId,
          word: item,
          nextTime: '99999999999999',
          times: 0,
        })
      )
      .promise()
  );

  try {
    // グループ単語登録
    await Promise.all(putTasks);
  } catch (err) {
    // キー既存あり以外の場合、エラーとする
    if ((err as AWSError).code !== 'ConditionalCheckFailedException') {
      throw err;
    }
  }

  // 単語存在確認
  const getTasks = input.words.map(item => client.get(getItem_words(WORDS_TABLE, item)).promise());
  const getResults = await Promise.all(getTasks);

  const targets: string[] = [];
  input.words.forEach((item, idx) => {
    const dbInfo = getResults[idx].Item;
    if (!dbInfo || Object.keys(dbInfo).length === 0) {
      targets.push(item);
    }
  });

  // すでに辞書に存在しました
  if (targets.length === 0) {
    return;
  }

  // 単語登録用の情報を収集する
  const taskArray = targets.map(item => Promise.all([getPronounce(item), getMP3(item), getTranslate(item, 'zh'), getTranslate(item, 'ja')]));

  const result = await Promise.all(taskArray);

  // 単語辞書登録
  putTasks = result.map(item => {
    const pronounce = item[0];
    const mp3 = item[1];
    const vocChn = item[2];
    const vocJpn = item[3];

    return client
      .put(
        putItem_words(WORDS_TABLE, {
          word: pronounce['word'],
          pronounce: pronounce['pronounce'],
          mp3,
          vocChn,
          vocJpn,
        })
      )
      .promise();
  });

  // 辞書登録処理
  await Promise.all(putTasks);
};

const getPronounce = async (word: string) => {
  const res = await axiosGet(`${IPA_URL}?word=${word}`, {
    headers: {
      'x-api-key': IPA_API_KEY,
    },
  });

  return res.data;
};

const getMP3 = async (word: string): Promise<string> => {
  const client = polly(pollyClient);

  /**  */
  const request: Polly.SynthesizeSpeechInput = {
    Text: word,
    TextType: 'text',
    VoiceId: 'Joanna',
    OutputFormat: 'mp3',
    LanguageCode: 'en-US',
  };

  const response = await client.synthesizeSpeech(request).promise();

  // ファイル名
  const filename: string = `${v4()}.mp3`;
  const prefix: string = `${moment().format('YYYYMMDD')}`;
  const key: string = `${prefix}/${filename}`;

  const putRequest: S3.Types.PutObjectRequest = {
    Bucket: MP3_BUCKET,
    Key: key,
    Body: response.AudioStream,
  };

  const sClient = s3(s3Client);
  // S3に保存する
  await sClient.putObject(putRequest).promise();

  return key;
};

const getTranslate = async (word: string, targetLanguageCode: string): Promise<string> => {
  const client = translate(translateClient);

  const request: Translate.TranslateTextRequest = {
    SourceLanguageCode: 'en',
    TargetLanguageCode: targetLanguageCode,
    Text: word,
  };

  const response = await client.translateText(request).promise();

  return response.TranslatedText;
};
