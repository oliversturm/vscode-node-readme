import * as vscode from 'vscode';
import * as request from 'request';
import * as url from 'url';

export class WebProvider implements vscode.TextDocumentContentProvider {
    public static SchemeIdentifier = "web-provider";

    public constructor(private defaultSchema : string) {

    }

    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
        if (uri.query && uri.query.length > 0) {
            uri.query = "?" + uri.query;
        }
        if (uri.fragment && uri.fragment.length > 0) {
            uri.fragment = "#" + uri.fragment;
        }

        let requestUrl = `${this.defaultSchema}://${uri.authority}${uri.path}${uri.query}${uri.fragment}`;

        return new Promise((resolve, reject) => {
            request.get(requestUrl, function (err, res, body) {
                if (err || res.statusCode.toString()[0] !== "2") {
                    return reject(err || new Error("Invalid status code " + res.statusCode));
                }

                resolve(body.toString());
            });
        });
    }
}