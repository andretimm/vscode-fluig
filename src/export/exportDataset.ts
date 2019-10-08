import * as vscode from 'vscode';
import * as fs from 'fs';
import Utils from '../utils';
import { MultiStepInput } from '../multiStepInput';

const soap = require('soap');

export async function exportDataset(context: any, files: any) {
    let editor: vscode.TextEditor | undefined;
    let fileList: string[] = [];
    if (context == undefined) {//Identifica quando vem do atalho 
        editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Nenhum editor está ativo, não é possível encontrar o arquivo atual para exportar.');
            return;
        }
        fileList = getListOfFiles([editor.document.uri]);
    } else {
        fileList = getListOfFiles(files)
    }

    if (fileList.length) {
        const serversConfig = Utils.getServersConfig();
        const currentServer = Utils.getCurrentServer();
        const server = Utils.getServerById(currentServer.id, serversConfig);
        if (fileList.length > 1) {
            vscode.window.showErrorMessage("Selecionae apenas um dataset por vez!");
        } else {
            const datasetDetail = await newDatasetDetails(context, fileList[0].name);            
            const content = fs.readFileSync(fileList[0].path, 'utf8');
            if (datasetDetail.isNew) {
                addDataset(server, datasetDetail.title, datasetDetail.description, content).then((data) => {
                    vscode.window.showInformationMessage(`Dataset ${datasetDetail.title} exportado com sucesso!`);
                }).catch((err) => {
                    vscode.window.showErrorMessage("Erro ao exportar o Dataset " + datasetDetail.title);
                });
            } else {                
                updateDataset(server, datasetDetail.title, datasetDetail.description, content).then((data) => {
                    vscode.window.showInformationMessage(`Dataset ${datasetDetail.title} exportado com sucesso!`);
                }).catch((err) => {
                    vscode.window.showErrorMessage("Erro ao exportar o Dataset " + datasetDetail.title);
                });
            }
        }
    } else {
        vscode.window.showErrorMessage("Nenhum arquivo selecionado");
    }
}

/**
 * Cria novo dataset no servidor
 * @param server Servidor atual
 * @param title Nome Dataset
 * @param description Descrição do Dataset
 * @param content Conteudo do Dataset
 */
function addDataset(server: any, title: string, description: string, content: string) {
    const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
    const args = { companyId: server.company, username: server.user, password: server.pass, name: title, description: description, impl: content };
    return new Promise((accept, reject) => {
        soap.createClient(url, function (err, client) {
            client.addDataset(args, function (err, result) {
                if (err) {                    
                    accept(false);
                } else {                    
                    accept(true);
                }
            });
        });
    })
}

/**
 * Atualiza dataset
 * @param server Servidor atual
 * @param title Nome Dataset
 * @param description Descrição do Dataset
 * @param content Conteudo do DatasetF 
 */
function updateDataset(server: any, title: string, description: string, content: string) {
    const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
    const args = { companyId: server.company, username: server.user, password: server.pass, name: title, description: description, impl: content };
    return new Promise((accept, reject) => {
        soap.createClient(url, function (err, client) {
            client.updateDataset(args, function (err, result) {
                if (err) {
                    accept(false);
                } else {
                    accept(true);
                }
            });
        });
    })
}



/**
 * Verifica se ja existe um dataset com este nome
 * @param dataset Nome do Dataset
 * @param server Dados do servidor
 */
function alreadyExists(dataset: string, server: any) {
    if (server) {
        const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
        const args = { companyId: server.company, username: server.user, password: server.pass, name: dataset };
        return new Promise((accept, reject) => {
            soap.createClient(url, function (err, client) {
                client.loadDataset(args, function (err, result) {
                    if (err) {
                        accept(false);
                    } else {
                        accept(true);
                    }
                });
            });
        });
    }
    return new Promise<boolean>((resolve, reject) => {
        return false;
    });
}

async function newDatasetDetails(context: vscode.ExtensionContext, name: string) {
    const TITLE = "Novo Dataset";
    const serversConfig = Utils.getServersConfig();
    const currentServer = Utils.getCurrentServer();
    const server = Utils.getServerById(currentServer.id, serversConfig);

    interface State {
        title: string;
        description: string;
        isNew: boolean;
        step: number;
        totalSteps: number;
    }

    let TOTAL_STEPS = 2;
    let TITLE_STEP = 1;
    let DESCRIPTION_STEP = 2;

    async function collectInputs() {
        const state = {} as Partial<State>;

        await MultiStepInput.run(input => inputTitle(input, state));

        return state as State;
    }

    async function inputTitle(input: MultiStepInput, state: Partial<State>) {
        state.title = await input.showInputBox({
            title: TITLE,
            step: TITLE_STEP,
            totalSteps: TOTAL_STEPS,
            value: name ? name : '',
            prompt: 'Informe o nome do Dataset',
            shouldResume: shouldResume,
            validate: validateDatasetNameValue,
            password: false
        });

        const existdataset = await alreadyExists(state.title, server)
        if (!existdataset) {
            state.isNew = true;
        } else {
            state.isNew = false;
        }
        return (input: MultiStepInput) => inputDescription(input, state);
    }

    async function inputDescription(input: MultiStepInput, state: Partial<State>) {
        state.description = await input.showInputBox({
            title: TITLE,
            step: DESCRIPTION_STEP,
            totalSteps: TOTAL_STEPS,
            value: name ? name : '',
            prompt: 'Informe a descrição do Dataset',
            shouldResume: shouldResume,
            validate: validateRequiredValue,
            password: false
        });
    }

    function shouldResume() {
        return new Promise<boolean>((resolve, reject) => {
            return false;
        });
    }

    async function validateRequiredValue(value: string) {
        return value === '' ? 'Informação requerida' : undefined;
    }

    async function validateDatasetNameValue(value: string) {
        if (value !== '') {
            if (value.indexOf(" ") == -1) {
                return undefined;
            } else {
                return 'Não pode conter espaço no nome';
            }
        } else {
            return 'Informação requerida';
        }
    }

    async function main() {
        return await collectInputs();
    }

    return await main();
}

/**
 * Retorna um array com o caminhos dos arquivos.
 * Pega apenas arquivos .js
 * @param allFiles Array de arquivos
 */
function getListOfFiles(allFiles: any[]) {
    let arrayFiles: any[] = [];
    allFiles.forEach(element => {
        if (element.fsPath &&
            (element.fsPath.indexOf(".js") != -1 ||
                element.fsPath.indexOf(".JS") != -1)) {

            arrayFiles.push({ path: element.fsPath, name: element.path.split("/").pop().split(".js").shift() });

        }
    });
    return arrayFiles;
}