import * as vscode from 'vscode';
import * as request from 'request';

export interface IRemoteContentProvider {
    /**
     * The default headers to be sent with the web request
     */
    defaultHeaders : {[key : string] : string};

    /**
     * The priority at which this provider will be evaluated for execution at
     * 
     * This determines the order in which providers will run
     */
    priority : number;

    /**
     * Determines if this provider should handle the given uri
     */
    shouldHandle(uri : vscode.Uri) : boolean;

    /**
     * Gives this provider an opportunity to preprocess the uri before we make the request
     */
    preprocessUri(uri : vscode.Uri) : vscode.Uri | Thenable<vscode.Uri>;

    /**
     * Issue the request for the given uri
     */
    processRequest(uri : vscode.Uri, token : vscode.CancellationToken) : Thenable<string>;

    /**
     * Gives this provider an opportunity to preprocess the response before we hand it back
     */
    preprocessResponse(res : any) : any | Thenable<any>;
}

/**
 * A default implementation of an IRemoteContentProvider
 */
export class BaseRemoteContentProvider implements IRemoteContentProvider {
    public constructor(public priority : number, public defaultHeaders ?: {[key: string] : string}) {

    }

    /**
     * Must be overriden
     */
    public shouldHandle(uri : vscode.Uri) : boolean {
        // this class is designed to be overriden
        throw new Error("Not implemented");
    }

    public preprocessUri(uri : vscode.Uri) : vscode.Uri | Thenable<vscode.Uri> {
        return uri;
    }

    public preprocessResponse(res : any) : any | Thenable<any> {
        return res;
    }

    public processRequest(uri : vscode.Uri, token : vscode.CancellationToken) : Thenable<string> {
        return new Promise<string>((resolve, reject) => {
            // process the uri
            let processedUri = this.preprocessUri(uri);
            if (processedUri instanceof vscode.Uri) {
                processedUri = Promise.resolve(processedUri);
            }
            let thenableUri = <Thenable<vscode.Uri>> processedUri;

            return thenableUri
                .then(this.makeRequest)
                .then(this.preprocessResponse)
                .then(this.extractBody);
        });
    }

    /**
     * Helper to actually make the web request
     */
    protected makeRequest(uri : vscode.Uri) : Thenable<any> {
        var self = this;
        return new Promise((resolve, reject) => {
            request({
                url: uri.toString(),
                headers: self.defaultHeaders || {}
            }, (err, res, body) => {
                if (err || res.statusCode.toString()[0] !== "2") {
                    return reject(err || new Error(`Invalid status code ${res.statusCode}`));
                }
                resolve(res);
            });
        });
    }

    /**
     * Helper to extract the body from a web request and convert it to a string
     */
    protected extractBody(res : any) : string {
        return res.body.toString();
    }
}

/**
 * The remote provider registry - responsible for determining which provider to use
 * for a given uri, then it calls that provider, and returns the data
 */
export class RemoteContentProviderRegistry implements vscode.TextDocumentContentProvider {
    /**
     * The schema that should be used to trigger this TextDocumentContentProvider
     */
    public static SchemaId = "node-readme-remote-provider";

    private static registry : IRemoteContentProvider[] = [];
    
    /**
     * Register a given IRemoteContentProvider into the registry so it can be used to provide data
     */
    public static Register(provider : IRemoteContentProvider) {
        this.registry.push(provider);
    }

    /**
     * The actual data provider
     */
    public provideTextDocumentContent(uri : vscode.Uri, token : vscode.CancellationToken) : string | Thenable<string> {
        const singletonRegistry = RemoteContentProviderRegistry.registry.sort((a, b) => {
            return a.priority - b.priority;
        });

        for (let i = 0 ; i < singletonRegistry.length ; i++) {
            if (singletonRegistry[i].shouldHandle(uri)) {
                return singletonRegistry[i].processRequest(uri, token).then((str) => {
                    console.log("dbg");
                    return str;
                })
            }
        }
        return <any> Promise.reject(new Error(`No valid provider was registered to handle uri: ${uri}`));
    }
}