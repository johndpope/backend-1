import { Request } from 'express';
import moment from 'moment';
import { C004Request } from '@typings/api';
import { TGroups, THistory } from '@typings/tables';
import { DBHelper, DateUtils } from '@utils';
import { History, Users, Words } from '@src/queries';

const GROUP_IDS: { [key: string]: string } = {};

export default async (req: Request): Promise<void> => {
  // if (!event.pathParameters || !event.body) {
  //   return;
  // }

  const groupId = 'groupid'; //event.pathParameters['groupId'];
  const word = 'word'; //event.pathParameters['word'];
  const input = JSON.parse(req.body) as C004Request;

  // 正解の場合
  const times = input.correct ? input.times + 1 : 0;
  const nextTime = input.correct ? DateUtils.getNextTime(input.times) : DateUtils.getNextTime(0);

  // 存在しない場合、検索し、保存する
  if (!Object.keys(GROUP_IDS).includes(groupId)) {
    // ユーザIDを検索する
    const ugResult = null; //await DBHelper().query(Users.query.byUserId(groupId));

    if (!ugResult.Items) {
      throw new Error('User info is not exists.');
    }

    // 保存する
    GROUP_IDS[groupId] = ((ugResult.Items[0] as unknown) as TGroups).userId;
  }

  // 旧イメージ
  const oldImage = await DBHelper().get(Words.get(word, groupId));

  const historyItem: THistory = {
    userId: GROUP_IDS[groupId],
    timestamp: moment().format('YYYYMMDDHHmmssSSS'),
    word,
    groupId,
    times,
  };

  // 最終日付が存在する場合、セットする
  if (oldImage.Item && oldImage.Item['lastTime']) {
    historyItem.lastTime = oldImage.Item['lastTime'];
  }

  // 両方更新する
  await DBHelper().transactWrite({
    TransactItems: [
      {
        Update: Words.update.updateItem02({
          id: word,
          groupId,
          lastTime: DateUtils.getNow(),
          nextTime,
          times,
        }),
      },
      {
        Put: History.put(historyItem),
      },
    ],
  });
};
