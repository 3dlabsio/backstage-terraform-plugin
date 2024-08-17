/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ConfigApi, DiscoveryApi } from '@backstage/core-plugin-api';
import { TerraformClient } from '../api';

export const createTerraformValidateRunAction = (options: {
  configApi: ConfigApi;
  discoveryApi: DiscoveryApi;
}) => {
  return createTemplateAction<{
    runID: string;
    token: string;
  }>({
    id: 'terraform:run:validate',
    schema: {
      input: {
        required: ['runID'],
        type: 'object',
        properties: {
          runID: {
            type: 'string',
            title: 'Terraform Run ID',
            description: 'The Terraform run ID to validate',
          },
          token: {
            type: 'string',
            title: 'Terraform Token',
            description: 'Terraform token',
          },
        },
      },
    },
    async handler(ctx) {
      const { runID, token } = ctx.input;
    
      const terraformApi = new TerraformClient(options, token);
      const pollInterval = 5000; // Poll every 5 seconds
      const targetStatus = 'applied'; // Target status to check for
    
      let run;
    
      while (true) {
        run = await terraformApi.getRunStatus(runID);
    
        if (run.data.attributes.status === targetStatus) {
          ctx.logger.info(`Run successfully applied: ${run.data.id}`);
          ctx.output('id', run.data.id);
          break; // Exit the loop once the target status is reached
        }
    
        ctx.logger.info(`Run status is ${run.data.attributes.status}. Polling again in 5 seconds...`);
    
        // Inline sleep logic
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  });
};
