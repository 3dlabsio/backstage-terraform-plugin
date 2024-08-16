/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ConfigApi, DiscoveryApi } from '@backstage/core-plugin-api';
import { TerraformClient } from '../api';
import { WorkspaceRequest } from '../api/types';

const DEFAULT_TERRAFORM_URL = 'https://app.terraform.io';

export const createTerraformWorkspaceAction = (options: {
  configApi: ConfigApi;
  discoveryApi: DiscoveryApi;
}) => {
  return createTemplateAction<{
    organization: string;
    name: string;
    vcsSourceProvider: string;
    vcsOwner: string;
    vcsRepo: string;
    vcsAuthUser: string;
    workingDirectory: string;
    agentPoolId?: string;
    autoApply?: boolean;
    project?: string;
    queueRuns?: boolean;
    token: string;
  }>({
    id: 'terraform:workspace:create',
    schema: {
      input: {
        required: [
          'organization',
          'name',
          'vcsSourceProvider',
          'vcsOwner',
          'vcsRepo',
        ],
        type: 'object',
        properties: {
          token: {
            type: 'string',
            title: 'Terraform Token',
            description: 'Terraform token',
          },
          organization: {
            type: 'string',
            title: 'Terraform Organization',
            description: 'The Terraform organization to create workspace',
          },
          name: {
            type: 'string',
            title: 'Name',
            description: 'The name of the Terraform workspace',
          },
          vcsSourceProvider: {
            type: 'string',
            title: 'VCS Source Provider',
            description:
              'The source provider for version control. Must be  "github", "github_enterprise", "gitlab_hosted", "gitlab_community_edition", "gitlab_enterprise_edition", or "ado_server"',
          },
          vcsOwner: {
            type: 'string',
            title: 'VCS Owner Identifer',
            description: 'The owner identifier for version control repository',
          },
          vcsRepo: {
            type: 'string',
            title: 'VCS Repository Identifer',
            description: 'The repo identifier for version control repository',
          },
          vcsAuthUser: {
            type: 'string',
            title: 'VCS User for Authentication',
            description:
              'The VCS user in Terraform workspace for authentication',
          },
          workingDirectory: {
            type: 'string',
            title: 'Working Directory',
            description: 'Working directory of Terraform configuration.',
          },
          agentPoolId: {
            type: 'string',
            title: 'Terraform Agent Pool ID',
            description: 'The identifier for Terraform agent pool',
          },
          autoApply: {
            type: 'boolean',
            title: 'Auto-Approve Applies',
            description: 'Enable auto-approval for applies in workspace.',
          },
          project: {
            type: 'string',
            title: 'Name of Project in Workspace',
            description: 'The name of the project in the workspace',
          },
          queueRuns: {
            type: 'boolean',
            title: 'Queue Runs',
            description: 'Queue a run after workspace creation',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        token,
        organization,
        name,
        vcsSourceProvider,
        vcsOwner,
        vcsRepo,
        vcsAuthUser,
        workingDirectory,
        agentPoolId,
        autoApply,
        project,
        queueRuns,
      } = ctx.input;
      const baseUrl =
        options.configApi.getOptionalString('scaffolder.terraform.baseUrl') ||
        DEFAULT_TERRAFORM_URL;

      const terraformApi = new TerraformClient(options, token);

      const oauthClient = await terraformApi.getOAuthClients(
        organization,
        vcsSourceProvider,
      );

      if (!oauthClient) {
        throw new Error(`oauth client not found for ${vcsSourceProvider}`);
      } else if (oauthClient.id === undefined) {
        throw new Error(`oauth client found but id is undefined for ${vcsSourceProvider}`);
      } else {
        ctx.logger.info(
          `Found OAuth client for ${vcsSourceProvider} with id ${oauthClient.id}`,
        );
      }

      const oauthToken = await terraformApi.getOAuthToken(
        oauthClient.id,
        vcsAuthUser,
      );

      ctx.logger.info(`Found OAuth Token with id ${oauthToken.id}`);

      const terraformProject =
        project !== undefined
          ? await terraformApi.getProject(organization, project).then(p => {
              return p.id;
            })
          : '';
      ctx.logger.info(`Found project with id ${terraformProject}`);

      const workspaceRequest: WorkspaceRequest = {
        data: {
          type: 'workspaces',
          attributes: {
            name: name,
            description: 'Generated by Backstage',
            'agent-pool-id': agentPoolId,
            'auto-apply': autoApply,
/*
            'vcs-repo': {
              identifier: `${vcsOwner}/${vcsRepo}`,
              'oauth-token-id': oauthToken.id,
            },

            'working-directory': workingDirectory,
*/
            'source-name': 'Backstage',
            'queue-all-runs': queueRuns,
          },
          relationships: {
            project: {
              data: {
                type: 'projects',
                id: terraformProject,
              },
            },
          },
        },
      };

      ctx.logger.info(JSON.stringify(workspaceRequest));

      const workspace = await terraformApi.createWorkspace(
        organization,
        workspaceRequest,
      );
      ctx.logger.info(`Created workspace with id ${workspace.data.id}`);
      ctx.output('url', `${baseUrl}/app/${organization}/workspaces/${name}`);
      ctx.output('id', workspace.data.id);
    },
  });
};
