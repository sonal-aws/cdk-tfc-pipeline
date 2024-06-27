import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep, Wave } from 'aws-cdk-lib/pipelines';
import { pipelineAppStage } from './stage-app';
import * as iam from 'aws-cdk-lib/aws-iam';

export class pipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOrg       = process.env.GITHUB_ORG       || "sonal-aws";
    const githubRepo      = process.env.GITHUB_REPO      || "cdk-tfc-pipeline";
    const githubBranch    = process.env.GITHUB_BRANCH    || "main";
    const devEnv          = process.env.DEV_ENV          || "dev";

    const pipeline = new CodePipeline(this, 'pipeline', {
      selfMutation:     true,
      crossAccountKeys: true,
      reuseCrossRegionSupportStacks: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(`${githubOrg}/${githubRepo}`, `${githubBranch}`,{
          // You need to replace the below code connection arn:
          connectionArn: `arn:aws:codestar-connections:us-east-1:${props?.env?.account}:connection/897f66d5-6488-4c5d-9174-d271a0e766e0`
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      }),
      synthCodeBuildDefaults: {
        rolePolicy: [
          new iam.PolicyStatement({
            resources: [ '*' ],
            actions: [ 'ec2:DescribeAvailabilityZones' ],
          }),
      ]}
    });

    const devStage = pipeline.addStage(new pipelineAppStage(this, `${devEnv}`, {
      env: { account: props?.env?.account, region: props?.env?.region}
    }));
    devStage.addPost(new ManualApprovalStep('approval'));
  }
}
