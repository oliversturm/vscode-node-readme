import * as vscode from 'vscode';
import {BaseRemoteContentProvider} from '../remote-provider';

export class GenericMarkdownRemoteContentProvider extends BaseRemoteContentProvider {
    public constructor() {
        super(100);
    }

    public shouldHandle(uri : vscode.Uri) {
        return uri.path.endsWith(".md");
    }
}