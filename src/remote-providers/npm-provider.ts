import * as vscode from 'vscode';
import {BaseRemoteContentProvider} from '../remote-provider';
import {GithubRemoteContentProvider} from './github-provider';

export class NpmRemoteContentProvider extends BaseRemoteContentProvider {
    private ghProvider : GithubRemoteContentProvider;
    public constructor() {
        super(70);

        this.ghProvider = new GithubRemoteContentProvider();
    }

    public shouldHandle(uri : vscode.Uri) {
        return uri.authority === "registry.npmjs.org";
    }

    public preprocessUri(uri : vscode.Uri) : vscode.Uri | Thenable<vscode.Uri> {
        if (uri.scheme !== "https") {
            return vscode.Uri.parse(`https://${uri.toString().split("://").slice(1).join("://")}`);
        }
    }

    public processRequest(uri : vscode.Uri, token : vscode.CancellationToken) : Thenable<string> {
        // process the uri
        let processedUri = this.preprocessUri(uri);
        if (processedUri instanceof vscode.Uri) {
            processedUri = Promise.resolve(processedUri);
        }
        let thenableUri = <Thenable<vscode.Uri>> processedUri;

        return thenableUri
            .then(this.makeRequest.bind(this)) // TODO: makeRequest probably shouldn't depend on 'this'
            .then(this.preprocessResponse)
            .then(this.extractBody)
            .then(JSON.parse)
            .then(this.extractVersionRepoUri)
            .then(this.makeRequest.bind(this.ghProvider))
            .then(this.ghProvider.preprocessResponse)
            .then(this.extractBody);
    }

    private extractVersionRepoUri(packageData : any) : Thenable<vscode.Uri> {
        return new Promise((resolve, reject) => {
            if (!packageData["dist-tags"] || !packageData["dist-tags"]["latest"]) {
                return reject(new Error("Invalid registry response"));
            }
            
            let latestVer = packageData["dist-tags"]["latest"];

            if (!packageData["versions"] || !packageData["versions"][latestVer]) {
                return reject(new Error("Missing registry response data"));
            }
            if (!packageData["versions"][latestVer]["repository"] || !packageData["versions"][latestVer]["repository"]["url"]) {
                return reject(new Error("Missing registry repository data"));
            }


            // a bad way to determine if the url is from github
            // TODO dreamup a better way
            let url = packageData["versions"][latestVer]["repository"]["url"];
            let parts = url.split("/");
            let githubUri = false;
            let githubParts = [];
            parts.forEach((p) => {
                if (p === "github.com") {
                    githubUri = true;
                } else if (githubUri) {
                    if (p.endsWith(".git")) {
                        p = p.replace(".git", "");
                    }
                    githubParts.push(p);
                }
            });
            githubParts.unshift("https://api.github.com/repos");
            githubParts.push("readme");

            if (!githubUri) {
                return reject(new Error("Unsupported registry repository type"));
            }

            resolve(vscode.Uri.parse(githubParts.join("/")));
        });
    }
}