import * as vscode from 'vscode';
import { commands } from 'vscode';
import { ServersExplorer } from './servers';
import { exportDataset } from './export/exportDataset';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "FLUIG" is now active!');

	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World!');
	});
	context.subscriptions.push(commands.registerCommand("extension.teste", () => { vscode.window.showInformationMessage('Hello World!'); }));
	context.subscriptions.push(disposable);

	//Exportar dataset
	context.subscriptions.push(commands.registerCommand('vs-fluig.export-dataset', (args, files) => exportDataset(args, files)));

	let viewServer = new ServersExplorer(context);
	if (!viewServer) {
		console.error('Visão "Servidores" não incializada.');
	}
}

export function deactivate() { }