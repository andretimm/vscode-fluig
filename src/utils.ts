import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as stripJsonComments from 'strip-json-comments';

const homedir = require('os').homedir();

export default class Utils {
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

            fs.writeFileSync(serversJson, JSON.stringify(sampleServer, null, "\t"), (err:) => {
                if (err) {
                    console.error(err);
                }
            });
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
        fs.writeFileSync(Utils.getServerConfigFile(), JSON.stringify(JSONServerInfo, null, "\t"), (err) => {
            if (err) {
                console.error(err);
            }
        });
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

                fs.writeFileSync(launchJson, JSON.stringify(sampleLaunch, null, "\t"), (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
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
}