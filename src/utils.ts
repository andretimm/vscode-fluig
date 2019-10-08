import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as stripJsonComments from 'strip-json-comments';

const homedir = require('os').homedir();

export interface SelectServer {
    name: string;
    id: string;
    token?: string;
    environment: string;
    environments?: string[];
}

export default class Utils {
    /**
	* Subscrição para evento de seleção de servidor/ambiente.
	*/
    static get onDidSelectedServer(): vscode.Event<SelectServer> {
        return Utils._onDidSelectedServer.event;
    }
    /**
	 * Emite a notificação de seleção de servidor/ambiente
	 */
    private static _onDidSelectedServer = new vscode.EventEmitter<SelectServer>();
    /**
	 * Cria uma nova configuracao de servidor no servers.json
	 */
    static createNewServer(typeServer: string, message: any, buildVersion: string): string | undefined {
        Utils.createServerConfig();
        const serverConfig = Utils.getServersConfig();

        if (serverConfig.configurations) {
            const servers = serverConfig.configurations;
            const serverId: string = Utils.generateRandomID();
            servers.push({
                id: serverId,
                type: typeServer,
                name: message.serverName,
                port: parseInt(message.serverPort),
                address: message.serverHost,
                company: parseInt(message.company),
                user: message.serverUser,
                pass: message.serverPass,
                buildVersion: buildVersion
            });

            Utils.persistServersInfo(serverConfig);
            return serverId;
        }
        return undefined;
    }
    /**
	 * Cria o arquivo servers.json caso ele nao exista.
	 */
    static createServerConfig() {
        const servers = Utils.getServersConfig();
        if (!servers) {
            const sampleServer = {
                version: "0.2.0",
                permissions: {
                    authorizationtoken: ""
                },
                connectedServer: {},
                configurations: []
            };

            if (!fs.existsSync(Utils.getServerConfigPath())) {
                fs.mkdirSync(Utils.getServerConfigPath());
            }

            let serversJson = Utils.getServerConfigFile();

            fs.writeFileSync(serversJson, JSON.stringify(sampleServer, null, "\t"));
        }
    }
    /**
	 * Retorna todo o conteudo do servers.json
	 */
    static getServersConfig() {
        let fs = require('fs');
        let exist = fs.existsSync(Utils.getServerConfigFile());
        if (exist) {
            let json = fs.readFileSync(Utils.getServerConfigFile()).toString();
            return JSON.parse(json);
        }
    }
    /**
	 * Grava no arquivo servers.json uma nova configuracao de servers
	 * @param JSONServerInfo
	 */
    static persistServersInfo(JSONServerInfo: any) {
        let fs = require('fs');
        fs.writeFileSync(Utils.getServerConfigFile(), JSON.stringify(JSONServerInfo, null, "\t"));
    }
    /**
	 * Deleta o servidor logado por ultimo do servers.json
	 */
    static deleteServer(id: string) {
        const allConfigs = Utils.getServersConfig();

        if (allConfigs.configurations) {
            const configs = allConfigs.configurations;

            configs.forEach((element: any) => {
                if (element.id === id) {
                    const index = configs.indexOf(element, 0);
                    configs.splice(index, 1);
                    Utils.persistServersInfo(allConfigs);
                    return;
                }
            });
        }
    }
    /**
	 * Retorna o servidor logado por ultimo do servers.json
	 */
    static returnServer(id: string) {
        const allConfigs = Utils.getServersConfig();
        let server = null;
        if (allConfigs.configurations) {
            const configs = allConfigs.configurations;

            configs.forEach((element: any) => {
                if (element.id === id) {
                    /*const index = configs.indexOf(element, 0);
                    configs.splice(index, 1);
                    Utils.persistServersInfo(allConfigs);*/
                    server = element;
                    return element;
                }
            });
        }
        return server;
    }
    /**
	 * Retorna o path completo do servers.json
	 */
    static getServerConfigFile() {
        return homedir + "/.vs-fluig/servers.json";
    }
    /**
	 * Retorna o path de onde deve ficar o servers.json
	 */
    static getServerConfigPath() {
        return homedir + "/.vs-fluig";
    }
    /**
	 * Gera um id de servidor
	 */
    static generateRandomID() {
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
    }
    /**
	 * Retorna todo o conteudo do launch.json
	 */
    static getLaunchConfig() {
        let fs = require('fs');
        let exist = fs.existsSync(Utils.getLaunchConfigFile());
        if (exist) {
            let json = fs.readFileSync(Utils.getLaunchConfigFile()).toString();
            return JSON.parse(stripJsonComments(json));
        }
    }
    /**
     * Retorna o path completo do launch.json
     */
    static getLaunchConfigFile() {
        let rootPath: string = vscode.workspace.rootPath || process.cwd();

        return path.join(rootPath, ".vscode", "launch.json");
    }
    /**
	 * Cria o arquivo launch.json caso ele nao exista.
	 */
    static createLaunchConfig() {
        const launchConfig = Utils.getLaunchConfig();
        if (!launchConfig) {
            let fs = require("fs");
            let ext = vscode.extensions.getExtension("TOTVS.tds-vscode");
            if (ext) {
                let sampleLaunch = {
                    "version": "0.2.0",
                    "configurations": []
                };

                let pkg = ext.packageJSON;
                let contributes = pkg["contributes"];
                let debug = (contributes["debuggers"] as any[]).filter((element: any) => {
                    return element.type === "totvs_language_debug";
                });

                if (debug.length === 1) {
                    let initCfg = (debug[0]["initialConfigurations"] as any[]).filter((element: any) => {
                        return element.request === "launch";
                    });

                    if (initCfg.length === 1) {
                        sampleLaunch = {
                            "version": "0.2.0",
                            "configurations": [(initCfg[0] as never)]
                        };
                    }
                }

                if (!fs.existsSync(Utils.getVSCodePath())) {
                    fs.mkdirSync(Utils.getVSCodePath());
                }

                let launchJson = Utils.getLaunchConfigFile();

                fs.writeFileSync(launchJson, JSON.stringify(sampleLaunch, null, "\t"));
            }

        }
    }
    /**
	 * Retorna o path da pastar .vscode dentro do workspace
	 */
    static getVSCodePath() {
        let rootPath: string = vscode.workspace.rootPath || process.cwd();

        return path.join(rootPath, ".vscode");
    }
    /**
	 *Atualiza no server.json o nome de um servidor
	 * @param id ID do server que sera atualizado
	 * @param newName Novo nome do servidor
	 */
    static updateServerName(id: string, newName: string) {
        let result = false;
        if (!id || !newName) {
            return result;
        }
        const serverConfig = Utils.getServersConfig();
        serverConfig.configurations.forEach((element: any) => {
            if (element.id === id) {
                element.name = newName;
                Utils.persistServersInfo(serverConfig);
                result = true;
            }
        });

        return result;
    }
    /**
	 * Salva o servidor logado por ultimo.
	 * @param id Id do servidor logado	 
	 * @param name Nome do servidor logado
	 * @param environment Ambiente utilizado no login
	 */
    static saveSelectServer(id: string, name: string, environment: string) {
        const servers = Utils.getServersConfig();

        servers.configurations.forEach((element: any) => {
            if (element.id === id) {
                if (element.environments === undefined) {
                    element.environments = [environment];
                } else if (element.environments.indexOf(environment) === -1) {
                    element.environments.push(environment);
                }
                element.environment = environment;

                let server: SelectServer = {
                    'name': element.name,
                    'id': element.id,
                    'environment': element.environment
                };
                servers.connectedServer = server;
                servers.lastConnectedServer = server;
                Utils._onDidSelectedServer.fire(server);
            }
        });

        Utils.persistServersInfo(servers);
    }
    /**
 	*Recupera um servidor pelo id informado.
 	* @param id id do servidor alvo.
 	*/
    static getServerById(id: string, serversConfig: any) {
        let server;
        if (serversConfig.configurations) {
            const configs = serversConfig.configurations;
            configs.forEach((element: any) => {
                if (element.id === id) {
                    server = element;
                    if (server.environments === undefined) {
                        server.environments = [];
                    }
                }
            });
        }
        return server;
    }
    /**
	 * Recupera o ultimo servidor logado
	 */
    static getCurrentServer() {
        const servers = Utils.getServersConfig();

        if (servers.connectedServer.id) {
            return servers.connectedServer;
        } else {
            return "";
        }
    }
}