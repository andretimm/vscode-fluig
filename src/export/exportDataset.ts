import * as vscode from 'vscode';
import * as fs from 'fs';
import Utils from '../utils';
import { MultiStepInput } from '../multiStepInput';

const soap = require('soap');

export function exportDataset(context: any, files: any) {
    /*if (files) {
        const fileList: string[] = getListOfFiles(files);
        const server = Utils.getCurrentServer();
        console.log(fileList);
        console.log(server);
        //TODO : Exportar dataset
    } else {
        vscode.window.showErrorMessage("Nenhum arquivo selecionado");
    }*/
}

export async function exportNewDataset(context: any, files: any) {
    const fileList: string[] = getListOfFiles(files);
    if (fileList.length) {
        const serversConfig = Utils.getServersConfig();
        const currentServer = Utils.getCurrentServer();
        const server = Utils.getServerById(currentServer.id, serversConfig);
        if (fileList.length > 1) {
            vscode.window.showErrorMessage("Selecionae apenas um dataset por vez!");
        } else {
            const datasetDetail = await newDatasetDetails(context);
            alreadyExists(datasetDetail.title, server).then((result)=>{
                if(!result){
                    console.log("existe");
                }
            }).catch((err)=>{
                console.log("Exite");
                vscode.window.showErrorMessage("Já existe um dataset com o nome de " + datasetDetail.title);
            });
        }
    } else {
        vscode.window.showErrorMessage("Nenhum arquivo selecionado");
    }
}

function alreadyExists(dataset: string, server: any) {
    if (server) {
        const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
        var args = { companyId: server.company, username: server.user, password: server.pass, name: dataset };
        return new Promise((accept, reject) => {
            soap.createClient(url, function (err, client) {
                client.loadDataset(args, function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        accept(true);
                    }
                });
            });
        })    
    }
    return new Promise<boolean>((resolve, reject) => {
        return false;
    });
}

async function newDatasetDetails(context: vscode.ExtensionContext) {
    const TITLE = "Novo Dataset";

    interface State {
        title: string;
        description: string;
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
            value: '',
            prompt: 'Informe o nome do Dataset',
            shouldResume: shouldResume,
            validate: validateRequiredValue,
            password: false
        });

        return (input: MultiStepInput) => inputDescription(input, state);
    }

    async function inputDescription(input: MultiStepInput, state: Partial<State>) {
        state.description = await input.showInputBox({
            title: TITLE,
            step: DESCRIPTION_STEP,
            totalSteps: TOTAL_STEPS,
            value: '',
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
    let arrayFiles: string[] = [];
    allFiles.forEach(element => {
        if (element.fsPath &&
            (element.fsPath.indexOf(".js") != -1 ||
                element.fsPath.indexOf(".JS") != -1)) {

            arrayFiles.push(element.fsPath);

        } else {
            if (fs.existsSync(element) &&
                (element.fsPath.indexOf(".js") != -1 ||
                    element.fsPath.indexOf(".JS") != -1)) {
                arrayFiles.push(element);
            }
        }
    });
    return arrayFiles;
}