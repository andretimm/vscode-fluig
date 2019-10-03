import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Utils from './utils';

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
                        command: 'totvs_server.selectEnvironment',
                        title: '',
                        arguments: [env]
                    }));
                    treeDataProvider.localServerItems[element.id].collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                    //Workaround: Bug que nao muda visualmente o collapsibleState se o label permanecer intalterado
                    treeDataProvider.localServerItems[element.id].label = treeDataProvider.localServerItems[element.id].label.endsWith(' ') ? treeDataProvider.localServerItems[element.id].label.trim() : treeDataProvider.localServerItems[element.id].label + ' ';
                    treeDataProvider.refresh();
                    element.environments = listOfEnvironments;
                    Promise.resolve(new EnvSection(element.label, element.currentEnvironment, element.collapsibleState, undefined, listOfEnvironments));
                }
                else {
                    return Promise.resolve([]);
                }
            }
        } else {
            if (!this.localServerItems) {
                const serverConfig = Utils.getServersConfig();
                if (serverConfig.configurations.length <= 0) { //se o servers.json existe
                    this.localServerItems = this.setConfigWithSmartClient();
                } else {
                    this.localServerItems = this.setConfigWithServerConfig();
                }

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
                    } else {
                        this.localServerItems = this.setConfigWithSmartClient();
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
        const serverItem = (serverItem: string, address: string, port: number, id: string, buildVersion: string, environments: Array<EnvSection>): ServerItem => {
            return new ServerItem(serverItem, address, port, vscode.TreeItemCollapsibleState.None, id, buildVersion, environments, {
                command: '',
                title: '',
                arguments: [serverItem]
            });
        };
        const listServer = new Array<ServerItem>();

        serverConfig.configurations.forEach(element => {
            let environmentsServer = new Array<EnvSection>();
            if (element.environments) {
                element.environments.forEach(environment => {
                    const env = new EnvSection(environment, element.name, vscode.TreeItemCollapsibleState.None,
                        { command: 'totvs_server.selectEnvironment', title: '', arguments: [environment] }, environment);
                    environmentsServer.push(env);
                });
            }

            listServer.push(serverItem(element.name, element.address, element.port, element.id, element.buildVersion, environmentsServer));
            listServer[listServer.length - 1].collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        });

        return listServer;
    }

	/**
	 * Inicia a arvore de servidores lendo o conteudo do smartclient.ini e
	 * cria o arquivo servers.json
	 */
    private setConfigWithSmartClient() {
        const config = Utils.getLaunchConfig();
        const configs = config.configurations;

        if (!configs) {
            return new Array<ServerItem>();
        }

        let scBinConf;
        configs.forEach(element => {
            if (element.type === 'totvs_language_debug') {
                scBinConf = element.smartclientBin;
            }
        });

        if (scBinConf) {
            const scIniPath = path.join(
                path.dirname(scBinConf),
                path.win32.basename(scBinConf, path.extname(scBinConf)) + '.ini'
            );
            if (this.pathExists(scIniPath)) {
                const serverItems = this.getTCPSecsInIniFile(scIniPath);
                this.saveServers(serverItems);
                return serverItems;
            } else {
                vscode.window.showInformationMessage('launch.json has an invalid smartclientBin configuration.');
                return new Array<ServerItem>();
            }
        } else {
            vscode.window.showInformationMessage('Add an attribute smartclientBin with a valid SmartClient path and the executable file name on launch.json.');
            return new Array<ServerItem>();
        }
    }

    private saveServers(serverItems: ServerItem[]) {
        Utils.createServerConfig();

        serverItems.forEach(element => {
			/*const id = */Utils.createNewServer("totvs_server_protheus", element, element.buildVersion);

            //A principio parece ser um exagero tentar validar TODOS os servidores ao salvar.
            //Caso essa informação venha do ini do smartclient por exemplo, pode ter um numero muito
            //grande de servidores cadastrados e esse processo fica bastante lento, pois caso o usuario peça
            //para conectar um servidor, o LS tera que processar todas essas requisições que ja estarao na fila
            //das mensagens para enfim processar a mensagem de conexão.

            // languageClient.sendRequest('$totvsserver/validation', {
            // 	validationInfo: {
            // 		server: element.address,
            // 		port: element.port
            // 	}
            // }).then((validInfoNode: NodeInfo) => {
            // 	if (id) {
            // 		Utils.updateBuildVersion(id, validInfoNode.buildVersion);
            // 	}
            // 	return;
            // });

        });
    }

	/**
	 * Given the path to smartclient.ini, read all its TCP Sections.
	 */
    private getTCPSecsInIniFile(scIniPath: string): ServerItem[] {
        if (this.pathExists(scIniPath)) {

            const toTCPSec = (serverItem: string, address: string, port: number, id: string, buildVersion: string): ServerItem => {
                return new ServerItem(serverItem, address, port, vscode.TreeItemCollapsibleState.None, id, buildVersion, undefined, {
                    command: 'totvs-developer-studio.selectNode',
                    title: '',
                    arguments: [serverItem]
                });
            };

            const scIniFileFs = fs.readFileSync(scIniPath, 'utf-8');

            let re = /^\[[^\]\r\n]+](?:\r?\n(?:[^[\r\n].*)?)*/igm;
            let matches = re.exec(scIniFileFs);

            const tcpSecs = new Array<ServerItem>();

            while ((matches = re.exec(scIniFileFs)) !== null) {
                let match = matches[0];
                let address = /^SERVER\s?=(?:\s+)?(.+)/im.exec(match);
                let port = /^PORT\s?=(?:\s+)?(.+)/im.exec(match);

                if ((address !== null) && (port !== null)) {
                    let key = /^\[(.+)\]/igm.exec(match);

                    if (key !== null) {
                        tcpSecs.push(toTCPSec(key[1], address[1], parseInt(port[1]), Utils.generateRandomID(), ""));
                    }
                }
            }
            this.localServerItems = tcpSecs;
            return tcpSecs;
        } else {
            return [];
        }
    }

    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p);
        } catch (err) {
            return false;
        }

        return true;
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
        public readonly address: string,
        public readonly port: number,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public id: string,
        public buildVersion: string,
        public environments?: Array<EnvSection>,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }

    get tooltip(): string {
        return `Server=${this.address} | Port=${this.port}`;
    }

    get description(): string {
        return `${this.address}:${this.port}`;
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
                            message.serverPass) {
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

}