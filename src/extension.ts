import * as vscode from 'vscode';
import { commands } from 'vscode';
import { ServersExplorer, updateStatusBarItem } from './servers';
import { exportDataset, exportNewDataset } from './export/exportDataset';
import Utils from './utils';
import { serverSelect } from './serverSelect';

// barra de status
export let fluigStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "FLUIG" is now active!');

	//Abre uma caixa de informações para login no servidor protheus.
	context.subscriptions.push(commands.registerCommand('vs-fluig.serverAuthentication', (...args) => {
		//TODO :  Selecionar servidor
		serverSelect(context, undefined);
	}));

	//inicialliza item de barra de status de servidor conectado ou não.
	fluigStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	fluigStatusBarItem.command = 'vs-fluig.serverAuthentication';
	context.subscriptions.push(fluigStatusBarItem);
	context.subscriptions.push(Utils.onDidSelectedServer(updateStatusBarItem));
	//Inicializa com o servidor selecionado
	const server = Utils.getCurrentServer();
	if (server) {
		updateStatusBarItem(server);
	} else {
		updateStatusBarItem(undefined);
	}

	//Exportar dataset
	context.subscriptions.push(commands.registerCommand('vs-fluig.export-dataset', (args, files) => exportDataset(args, files)));
	context.subscriptions.push(commands.registerCommand('vs-fluig.import-dataset', (args, files) => exportNewDataset(args, files)));

	let viewServer = new ServersExplorer(context);
	if (!viewServer) {
		console.error('Visão "Servidores" não incializada.');
	}
}

export function deactivate() { }