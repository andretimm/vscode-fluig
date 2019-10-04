import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Utils, { SelectServer } from './utils';
import { fluigStatusBarItem } from './extension';

import axios from 'axios';

const compile = require('template-literal');

export let connectedServerItem: ServerItem | undefined;

export class ServerItemProvider implements vscode.TreeDataProvider<ServerItem | EnvSection> {

    private _onDidChangeTreeData: vscode.EventEmitter<ServerItem | EnvSection | undefined> = new vscode.EventEmitter<ServerItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ServerItem | EnvSection | undefined> = this._onDidChangeTreeData.event;

    public localServerItems: Array<ServerItem> = [];

    constructor() {
        this.addServersConfigListener();
        this.addLaunchJsonListener();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ServerItem | EnvSection): vscode.TreeItem {
        if (element instanceof ServerItem) {
            let iconPath = {
                light: path.join(__filename, '..', '..', 'resources', 'light', connectedServerItem !== undefined && element.id === connectedServerItem.id ? 'server.connected.svg' : 'server.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'dark', connectedServerItem !== undefined && element.id === connectedServerItem.id ? 'server.connected.svg' : 'server.svg')
            };
            element.iconPath = iconPath;
        }
        return element;
    }

    getChildren(element?: ServerItem): Thenable<ServerItem[] | EnvSection[]> {
        if (element) {
            if (element.environments) {
                return Promise.resolve(element.environments);
            }
            else {
                const servers = Utils.getServersConfig();
                const listOfEnvironments = servers.configurations[element.id].environments;
                if (listOfEnvironments.size > 0) {
                    treeDataProvider.localServerItems[element.id].environments = listOfEnvironments.map(env => new EnvSection(env, element.label, vscode.TreeItemCollapsibleState.None, {
                        command: 'vs-fluig.selectEnvironment',
                        title: '',
                        arguments: [env]
                    }));
                    treeDataProvider.localServerItems[element.id].collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                    treeDataProvider.localServerItems[element.id].label = treeDataProvider.localServerItems[element.id].label.endsWith(' ') ? treeDataProvider.localServerItems[element.id].label.trim() : treeDataProvider.localServerItems[element.id].label + ' ';
                    treeDataProvider.refresh();
                    element.environments = listOfEnvironments;
                    Promise.resolve(new EnvSection(element.label, element.currentEnvironment, element.collapsibleState, element.command, listOfEnvironments));
                }
                else {
                    return Promise.resolve([]);
                }
            }
        } else {
            if (this.localServerItems.length <= 0) {
                //const serverConfig = Utils.getServersConfig();
                this.localServerItems = this.setConfigWithServerConfig();
            }
        }

        return Promise.resolve(this.localServerItems.sort((srv1, srv2) => {
            const label1 = srv1.label.toLowerCase();
            const label2 = srv2.label.toLowerCase();
            if (label1 > label2) { return 1; }
            if (label1 < label2) { return -1; }
            return 0;
        }));
    }

    private addServersConfigListener(): void {
        let serversJson = Utils.getServerConfigFile();
        if (!fs.existsSync(serversJson)) {
            Utils.createServerConfig();
        }
        //Caso o arquivo servers.json seja encontrado, registra o listener já na inicialização.
        fs.watch(serversJson, { encoding: 'buffer' }, (eventType, filename) => {
            if (filename && eventType === 'change') {
                this.localServerItems = this.setConfigWithServerConfig();
                this.refresh();
            }
        });
    }

    private addLaunchJsonListener(): void {
        let launchJson = Utils.getLaunchConfigFile();

        if (!fs.existsSync(launchJson)) {
            Utils.createLaunchConfig();
        }

        if (fs.existsSync(launchJson)) { //Caso o arquivo launch.json seja encontrado, registra o listener já na inicialização.
            fs.watch(launchJson, { encoding: 'buffer' }, (eventType, filename) => {
                const serverConfig = Utils.getServersConfig();
                if (filename && eventType === 'change') {
                    if (serverConfig.configurations.length > 0) {
                        this.localServerItems = this.setConfigWithServerConfig();
                    }
                    this.refresh();
                }
            });
        }
    }

	/**
	 * Cria os itens da arvore de servidores a partir da leitura do arquivo servers.json
	 */
    private setConfigWithServerConfig() {
        const serverConfig = Utils.getServersConfig();
        const serverItem = (serverItem: string, serverHost: string, serverPort: number, id: string, buildVersion: string, environments: Array<EnvSection>): ServerItem => {
            return new ServerItem(serverItem, serverHost, serverPort, vscode.TreeItemCollapsibleState.None, id, buildVersion, environments, {
                command: 'vs-fluig.selectEnvironment',
                title: '',
                arguments: [id]
            });
        };
        const listServer = new Array<ServerItem>();

        serverConfig.configurations.forEach(element => {
            let environmentsServer = new Array<EnvSection>();
            if (element.environments) {
                element.environments.forEach(environment => {
                    const env = new EnvSection(environment, element.name, vscode.TreeItemCollapsibleState.None,
                        { command: 'vs-fluig.selectEnvironment', title: '', arguments: [environment] }, environment);
                    environmentsServer.push(env);
                });
            }

            listServer.push(serverItem(element.name, element.address, element.port, element.id, element.buildVersion, environmentsServer));
            listServer[listServer.length - 1].collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        });

        return listServer;
    }

}

export class EnvSection extends vscode.TreeItem {

    constructor(
        public label: string,
        public readonly serverItemParent: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public environments?: string[]
    ) {
        super(label, collapsibleState);
    }

    get tooltip(): string {
        return `${this.label}: ${this.serverItemParent}`;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', connectedServerItem !== undefined && connectedServerItem.currentEnvironment == this.label ? 'environment.connected.svg' : 'environment.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', connectedServerItem !== undefined && connectedServerItem.currentEnvironment == this.label ? 'environment.connected.svg' : 'environment.svg')
    };

    contextValue = 'envSection';
}

export class ServerItem extends vscode.TreeItem {

    public isConnected: boolean = false;
    public token: string = '';
    public currentEnvironment: string = '';

    constructor(
        public label: string,
        public readonly serverHost: string,
        public readonly serverPort: number,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public id: string,
        public buildVersion: string,
        public environments?: Array<EnvSection>,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }

    get tooltip(): string {
        return `Server=${this.serverHost} | Port=${this.serverPort}`;
    }

    get description(): string {
        return `${this.serverHost}:${this.serverPort}`;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', connectedServerItem !== undefined && this.id === connectedServerItem.id ? 'server.connected.svg' : 'server.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', connectedServerItem !== undefined && this.id === connectedServerItem.id ? 'server.connected.svg' : 'server.svg')
    };

    contextValue = 'serverItem';
}

const treeDataProvider = new ServerItemProvider();
export class ServersExplorer {

    constructor(context: vscode.ExtensionContext) {
        vscode.window.createTreeView('fluig-servers', { treeDataProvider });

        vscode.window.registerTreeDataProvider('fluig-servers', treeDataProvider);

        //Evento ao selecionar servidor
        vscode.commands.registerCommand("vs-fluig.selectEnvironment", (item: vscode.TreeItem) => {
            console.log(item);
        });

        vscode.commands.registerCommand('vs-fluig.connect-server', (serverItem: ServerItem) => {
            let ix = treeDataProvider.localServerItems.indexOf(serverItem);
            if (ix >= 0) {
                authenticate(serverItem);                
            }
        });

        vscode.commands.registerCommand('vs-fluig.delete-server', (serverItem: ServerItem) => {
            let ix = treeDataProvider.localServerItems.indexOf(serverItem);
            if (ix >= 0) {
                Utils.deleteServer(serverItem.id);
            }
        });

        vscode.commands.registerCommand('vs-fluig.rename-server', (serverItem: ServerItem) => {
            let ix = treeDataProvider.localServerItems.indexOf(serverItem);
            if (ix >= 0) {
                vscode.window.showInputBox({
                    placeHolder: "Renomear Server",
                    value: serverItem.label
                }).then((newName) => {
                    if (newName) {
                        Utils.updateServerName(serverItem.id, newName);
                    }
                });
            }
        });

        let currentPanel: vscode.WebviewPanel | undefined = undefined;

        vscode.commands.registerCommand("vs-fluig.add-server", () => {
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
                        console.log(message.serverName);
                        if (message.serverName &&
                            message.serverHost &&
                            message.serverPort &&
                            message.serverUser &&
                            message.serverPass &&
                            message.company) {
                            const typeServer = "vs-fluig-servers";
                            const serverId = createServer(typeServer, message, "", true);
                            //Fecha aba
                            if (currentPanel) {
                                currentPanel.dispose();
                            }
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
        });

        //Rederiza a view
        function getWebViewContent(context: any) {
            const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'view', 'server', 'addServer.html'));
            const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'view', 'server', 'addServer.css'));
            const htmlContent = fs.readFileSync(htmlPath.with({ scheme: 'vscode-resource' }).fsPath);
            const cssContent = fs.readFileSync(cssPath.with({ scheme: 'vscode-resource' }).fsPath);
            let runTemplate = compile(htmlContent);
            return runTemplate({ css: cssContent });
        }

        //Cria o servidor
        function createServer(typeServer: string, message: any, buildVersion: string, showSucess: boolean): string | undefined {
            const serverId = Utils.createNewServer(typeServer, message, buildVersion);
            if (treeDataProvider !== undefined) {
                treeDataProvider.refresh();
            }
            if (showSucess) {
                vscode.window.showInformationMessage("Saved server " + message.serverName);
            }
            return serverId;
        }
    }

    refreshItens() {
        if (treeDataProvider !== undefined) {
            treeDataProvider.refresh();
        }
    }

}

/**
 * Pega versão o servidor
 * @param serverItem ServerItem
 */
export async function authenticate(serverItem: ServerItem) {
    const serversConfig = Utils.getServersConfig();
    const server = Utils.getServerById(serverItem.id, serversConfig);
    try {
        const fluigVersion = await axios.get(`${server.address}:${server.port}/ecm/api/rest/ecm/studioWorkflowRest/version?username=${server.user}&password=${server.pass}`);
        if (fluigVersion.status == 200 && fluigVersion.data) {
            Utils.saveSelectServer(serverItem.id, serverItem.label, fluigVersion.data);
            if (treeDataProvider !== undefined) {
                connectedServerItem = serverItem;
                connectedServerItem.currentEnvironment = fluigVersion.data;
                treeDataProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage("Erro ao autenticar no servidor!");
        }
    } catch (error) {
        vscode.window.showErrorMessage("Erro ao autenticar no servidor!");
    }

}

export function updateStatusBarItem(selectServer: SelectServer | undefined): void {
    if (selectServer) {
        fluigStatusBarItem.text = `${selectServer.name} / ${selectServer.environment}`;
    } else {
        fluigStatusBarItem.text = '[ Selecionar servidor/ambiente ]';
    }

    fluigStatusBarItem.show();
}