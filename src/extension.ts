import * as vscode from 'vscode';
import { commands } from 'vscode';
import { ServersExplorer } from './servers';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "FLUIG" is now active!');

	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World!');
	});
	context.subscriptions.push(commands.registerCommand("extension.teste", () => { vscode.window.showInformationMessage('Hello World!'); }));
	context.subscriptions.push(disposable);
	let viewServer = new ServersExplorer(context);
	viewServer.refreshItens();
	if (!viewServer) {
		console.error('Visão "Servidores" não incializada.');
	}
}

export function deactivate() { }