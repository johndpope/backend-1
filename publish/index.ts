import { Lambda, CodeDeploy } from 'aws-sdk';
import * as jsyaml from 'js-yaml';
import _ from 'lodash';

// Project Name
const PROJECT_NAME = process.env.PROJECT_NAME_UC as string;
// Lambda Alias Name
const FUNCTION_ALIAS = process.env.FUNCTION_ALIAS as string;
// CodeDeploy App名
const APPLICATION_NAME = process.env.APPLICATION_NAME as string;
// CodeDeploy DeploymentGroup
const DEPLOYMENT_GROUPNAME = process.env.DEPLOYMENT_GROUPNAME as string;

// Lambda Client
const client = new Lambda({
  region: process.env.AWS_DEFAULT_REGION
});
// CodeDeploy Client
const cdClient = new CodeDeploy({
  region: process.env.AWS_DEFAULT_REGION
});

process.on('unhandledRejection', err => {
  console.log('Error', err);
  process.exit(1);
});

const start = async () => {
  // Get Lambda Function List
  const listFunctions = await client.listFunctions().promise();

  // 対象存在しない場合、処理スキップ
  if (!listFunctions.Functions) {
    return;
  }

  console.log(`Functions: ${listFunctions.Functions.length}`);
  // 対象外のFunctionを除外する
  const functions = listFunctions.Functions.filter(item => item.FunctionName && item.FunctionName.startsWith(PROJECT_NAME));

  // 対象が存在しない
  if (functions.length === 0) return;

  console.log(`Target Functions: ${functions.length}`);

  const deploys = functions.map(async item => {
    const { FunctionName: fullName = '' } = item;

    const aliases = await client
      .listAliases({
        FunctionName: fullName
      })
      .promise();

    // No Alias
    if (aliases.Aliases.length === 0) {
      console.log(`Function name: ${fullName}, No Alias`);
      return;
    }

    const alias = aliases.Aliases.find(item => item.Name === FUNCTION_ALIAS);

    const qualifies = await client
      .listVersionsByFunction({
        FunctionName: fullName
      })
      .promise();

    // required check
    if (!alias.FunctionVersion || !qualifies.Versions || qualifies.Versions.length === 0) {
      return;
    }

    // latest version
    const latest = _.orderBy(qualifies.Versions, 'Version', 'desc')[0];

    // not changed
    if (alias.FunctionVersion === latest.Version) {
      console.log(`Function name: ${fullName}, Not changed.`);
      return;
    }

    console.log(`Function name: ${fullName}, Version Update: ${alias.FunctionVersion} -> ${latest.Version}`);

    const appspec = {} as any;
    appspec['version'] = '0.0';
    appspec['Resources'] = [
      {
        [getFunctionName(fullName)]: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Name: fullName,
            Alias: FUNCTION_ALIAS,
            CurrentVersion: Number(alias.FunctionVersion),
            TargetVersion: Number(latest.Version)
          }
        }
      }
    ];

    return cdClient
      .createDeployment({
        applicationName: APPLICATION_NAME,
        deploymentGroupName: DEPLOYMENT_GROUPNAME,
        revision: {
          revisionType: 'AppSpecContent',
          appSpecContent: {
            content: jsyaml.safeDump(appspec)
          }
        }
      })
      .promise();
  });

  // バージョン切替処理を実行する
  await Promise.all(deploys);
};

const getFunctionName = (fullName: string) => fullName.replace(PROJECT_NAME, '').replace('_', '');

start();