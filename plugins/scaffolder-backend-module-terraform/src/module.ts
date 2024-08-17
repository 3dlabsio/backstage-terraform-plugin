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
import {
    createBackendModule,
    coreServices
  } from '@backstage/backend-plugin-api';
  import { ScmIntegrations } from '@backstage/integration';
  import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
  import {
    createTerraformProjectAction,
    createTerraformWorkspaceAction,
    createTerraformRunAction,
    createTerraformVariablesAction,
    createTerraformValidateRunAction,
  } from './actions';

  /**
   * @public
   * The Terraform Module for the Scaffolder Backend
   */
  export const terraformModule = createBackendModule({
    moduleId: 'terraform',
    pluginId: 'scaffolder',

    register({ registerInit }) {
      registerInit({
        deps: {
          scaffolderActions: scaffolderActionsExtensionPoint,
          config: coreServices.rootConfig,
          logger: coreServices.logger,
          discovery: coreServices.discovery,
          httpRouter: coreServices.httpRouter,
          identity: coreServices.identity,
          tokenManager: coreServices.tokenManager,
          auth: coreServices.auth,
          httpAuth: coreServices.httpAuth,
        },
        async init({ scaffolderActions, config, discovery}) {
          const integrations = ScmIntegrations.fromConfig(config);
          scaffolderActions.addActions(
            createTerraformProjectAction({
              configApi: config,
              discoveryApi: discovery,
            }),
            createTerraformWorkspaceAction({
              configApi: config,
              discoveryApi: discovery,
            }),
            createTerraformRunAction({
              configApi: config,
              discoveryApi: discovery,
            }),
            createTerraformVariablesAction({
              configApi: config,
              discoveryApi: discovery,
            }),
            createTerraformValidateRunAction({
              configApi: config,
              discoveryApi: discovery,
            }),
          );
        },
      });
    },
  });
