import { Request } from 'express';
import { C005Response, C005Params } from 'typings/api';
import { DBHelper } from '@utils';
import { Words } from '@queries';

export default async (req: Request): Promise<C005Response> => {
  const params = (req.params as unknown) as C005Params;

  await DBHelper().delete(Words.del({ id: params.word, groupId: params.groupId }));

  return;
};
