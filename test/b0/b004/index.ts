import chai from 'chai';
import chaiHttp from 'chai-http';
import server from '@app';
import { DBHelper } from '@utils';
import { Groups } from '@queries';

chai.use(chaiHttp);
chai.should();

describe('B004', () => {
  it('Case001', async () => {
    const req = require('./datas/req001.json');
    const URL = '/groups/B003';
    const res = await chai.request(server).put(URL).set('authorization', 'B003').send(req);

    chai.expect(res.status).to.be.eq(200);

    const result = await DBHelper().get(Groups.get({ id: 'B003', userId: 'B003' }));

    chai.expect(result.Item).to.be.deep.eq(require('./datas/res001.json'));
  });
});