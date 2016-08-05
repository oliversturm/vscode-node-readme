import * as vscode from 'vscode';
import {BaseRemoteContentProvider} from '../remote-provider';

export class GithubRemoteContentProvider extends BaseRemoteContentProvider {
    public constructor() {
        super(10, {
            "User-Agent": "bengreenier/vscode-node-readme",
            "Accept": "application/vnd.github.v3.raw"
        });
    }

    public shouldHandle(uri : vscode.Uri) {
        return uri.authority === "api.github.com" || uri.authority === "www.github.com" || uri.authority === "github.com" && uri.path.endsWith(".md");
    }

    public preprocessUri(uri : vscode.Uri) {
        if (uri.authority === "api.github.com") {
            if (uri.scheme === "https") {
                return uri;
            } else {
                return vscode.Uri.parse(`https://${uri.toString().split("://").slice(1).join("://")}`);
            }
        }

        let explodedPath = uri.path.split("/");
        return vscode.Uri.parse(`https://api.github.com/repos/${explodedPath[0]}/${explodedPath[1]}/contents/${explodedPath.slice(2).join("/")}`);
    }
}
