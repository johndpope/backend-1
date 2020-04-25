import { DynamoDB } from 'aws-sdk';
import { Environment } from '@src/consts';
import { TGroups, GroupsKey } from '@typings/tables';
import * as query from './query';

/** データ取得 */
export const get = (key: GroupsKey): DynamoDB.DocumentClient.GetItemInput => ({
  TableName: Environment.TABLE_GROUPS,
  Key: key,
});

/** データ登録 */
export const put = (item: TGroups): DynamoDB.DocumentClient.PutItemInput => ({
  TableName: Environment.TABLE_GROUPS,
  Item: item,
});

/** データ削除 */
export const del = (userId: string, groupId: string): DynamoDB.DocumentClient.DeleteItemInput => ({
  TableName: Environment.TABLE_GROUPS,
  Key: {
    userId,
    groupId,
  },
});

export { query };
