'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {LocalDataProvider} from './localdata';
import {RemoteContentProviderRegistry} from './remote-provider';
import {RemoteProvidersIndex} from './remote-providers/index';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context) {
    RemoteProvidersIndex.RegisterAll();

    let disposable = vscode.commands.registerCommand('nodeReadme.showReadme', () => {
        let e = vscode.window.activeTextEditor;
        let d = e.document;
        let moduleName;

        if (d.languageId === "javascript") {
            let pos = e.selection.start;
            let line = d.lineAt(pos.line);

            // figure out what module we want
            let re = /require\(['"]([^'"]+)['"](?:, ['"]([^'"]+)['"])?\);?/g;
            let str = line.text;
            let matched;
            while ((matched = re.exec(str)) != null) {
                if (matched.index <= pos.character && pos.character <= re.lastIndex) {
                    moduleName = matched[1];
                    break;
                }
            }
        } else if (d.languageId === "typescript") {
            
            let pos = e.selection.start;
            let line = d.lineAt(pos.line);

            // figure out what module we want
            let re = /import .*?from\s|("|')(.*?)("|')/g;
            let str = line.text;
            let matched;
            while ((matched = re.exec(str)) != null) {
                if (matched.index <= pos.character && pos.character <= re.lastIndex) {
                    moduleName = matched[2];
                    break;
                }
            }
        }

        // the following optionally depends on input so we promise-ify it
        let thenable : PromiseLike<string>;

        if (!moduleName) {
            thenable = vscode.window.showInputBox({
                prompt: "Enter Module name"
            });
        } else {
            thenable = Promise.resolve(moduleName);
        }

        // note that this hides moduleName in the outer scope
        thenable.then((moduleName) => {

            let config = vscode.workspace.getConfiguration("node-readme");
            let moduleMappings = config.get("moduleMappings");

            if (moduleMappings[moduleName]) {
                return vscode.commands.executeCommand("markdown.showPreviewToSide", vscode.Uri.parse(moduleMappings[moduleName]));
            }
            // TODO move this fs.exists call into some public method on localdata
            else if (fs.existsSync(path.join(vscode.workspace.rootPath, "node_modules", moduleName, "readme.md"))) {
                return vscode.commands.executeCommand("markdown.showPreviewToSide", vscode.Uri.parse(`${LocalDataProvider.SchemaType}://disk.local/${moduleName}`));
            } else {
                return vscode.commands.executeCommand("markdown.showPreviewToSide", vscode.Uri.parse(`${RemoteContentProviderRegistry.SchemaId}://registry.npmjs.org/${moduleName}`));
            }
        });
    });
    context.subscriptions.push(disposable,
        vscode.workspace.registerTextDocumentContentProvider(LocalDataProvider.SchemaType, new LocalDataProvider()),
        vscode.workspace.registerTextDocumentContentProvider(RemoteContentProviderRegistry.SchemaId, new RemoteContentProviderRegistry()));
}

// this method is called when your extension is deactivated
export function deactivate() {
}