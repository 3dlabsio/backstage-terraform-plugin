/*
 * Copyright 2024 Dun & Bradstreet
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
      const pollSeconds = 30; // Number of seconds to poll for status
      const pollInterval = pollSeconds * 1000; // Poll interval
      const targetStatus = 'applied'; // Target status to check for
    
      let run;
    
      while (true) {
        run = await terraformApi.getRunStatus(runID);
        const runStatus = run.data.attributes.status;
        
        if (runStatus === targetStatus) {
          ctx.logger.info(`Run successfully applied: ${run.data.id}`);
          ctx.output('id', run.data.id);
          break; // Exit the loop once the target status is reached
        } else if (runStatus === 'errored') {
          ctx.logger.error("Plan errored or hard-mandatory policy failed.");
          ctx.output('status', 'errored');
          break; // Exit on errored status
        } else if (runStatus === 'planned_and_finished') {
          ctx.logger.info("Plan indicates no changes to apply.");
          ctx.output('status', 'planned_and_finished');
          break; // Exit on planned_and_finished status
        } else if (runStatus === 'canceled') {
          ctx.logger.warn("The run was canceled.");
          ctx.output('status', 'canceled');
          break; // Exit on canceled status
        } else if (runStatus === 'force_canceled') {
          ctx.logger.warn("The run was canceled forcefully.");
          ctx.output('status', 'force_canceled');
          break; // Exit on force_canceled status
        } else if (runStatus === 'discarded') {
          ctx.logger.warn("The run was discarded.");
          ctx.output('status', 'discarded');
          break; // Exit on discarded status
        }    
    
        ctx.logger.info(`Run status is ${run.data.attributes.status}. Polling again in ${pollSeconds} seconds...`);
    
        // Inline sleep logic
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  });
};
