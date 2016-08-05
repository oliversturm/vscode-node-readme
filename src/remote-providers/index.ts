import {RemoteContentProviderRegistry} from '../remote-provider';

import {GenericMarkdownRemoteContentProvider} from './generic-md-provider';
import {GithubRemoteContentProvider} from './github-provider';
import {NpmRemoteContentProvider} from './npm-provider';

export class RemoteProvidersIndex {

    /**
     * Register all the remote providers to the registry
     */
    public static RegisterAll() {
        RemoteContentProviderRegistry.Register(new GenericMarkdownRemoteContentProvider());
        RemoteContentProviderRegistry.Register(new GithubRemoteContentProvider());
        RemoteContentProviderRegistry.Register(new NpmRemoteContentProvider());
    }
}