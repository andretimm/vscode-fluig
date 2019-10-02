import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const compile = require('template-literal');

export class ServersExplorer {

    constructor(context: vscode.ExtensionContext) {
        let currentPanel: vscode.WebviewPanel | undefined = undefined;

        let fluigAddServer = vscode.commands.registerCommand("vs-fluig.add-server", () => {
            if (currentPanel) {
                currentPanel.reveal();
            } else {
                currentPanel = vscode.window.createWebviewPanel("vs-fluig.add-server",
                    "Novo Servidor",
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'view', 'server'))],
                        retainContextWhenHidden: true
                    });

                currentPanel.webview.html = getWebViewContent(context);

                currentPanel.onDidDispose(
                    () => {
                        currentPanel = undefined;
                    },
                    null,
                    context.subscriptions
                );

                currentPanel.webview.onDidReceiveMessage(
                    message => {
                        console.log(message.command);
                        if (currentPanel) {
                            if (message.close) {
                                currentPanel.dispose();
                            }
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
            vscode.window.showInformationMessage('Add server');
        });

        //context.subscriptions.push(fluigAddServer);

        function getWebViewContent(context: any) {
            const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'view', 'server', 'addServer.html'));
            const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'view', 'server', 'addServer.css'));
            const htmlContent = fs.readFileSync(htmlPath.with({ scheme: 'vscode-resource' }).fsPath);
            const cssContent = fs.readFileSync(cssPath.with({ scheme: 'vscode-resource' }).fsPath);
            let runTemplate = compile(htmlContent);

            return runTemplate({ css: cssContent });
        }

    }

}