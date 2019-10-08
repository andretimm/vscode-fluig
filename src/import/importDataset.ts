import { ExtensionContext, QuickPickItem, workspace, window } from "vscode";
import * as fs from 'fs';
import Utils from '../utils';
import { MultiStepInput } from "../multiStepInput";

const soap = require('soap');

export async function importDataset(context: ExtensionContext) {
    const serversConfig = Utils.getServersConfig();
    const currentServer = Utils.getCurrentServer();
    const server = Utils.getServerById(currentServer.id, serversConfig);
    const datasetSelected = await selectDataset(context);
    //TODO : Valiar se tem mais de uma workspace aberta workspace.workspaceFolders
    const datasetDir = getDatasetDir();
    const loadedDataset: any = await loadDataset(server, datasetSelected.dataset.label);
    if (loadedDataset) {
        if (loadedDataset.dataset.datasetBuilder.indexOf('CustomizedDatasetBuilder') != -1) {
            fs.writeFileSync(`${datasetDir}\\${datasetSelected.dataset.label}.js`, loadedDataset.dataset.datasetImpl);
        } else {
            window.showInformationMessage('Apenas datasets customizados são permitidos!');
        }
    } else {
        window.showErrorMessage('Erro ao carregar dataset.');
    }
}

/**
 * Retornar path dos datasets
 */
function getDatasetDir(): string {
    const WORKSPACE_DIR: any = workspace.rootPath;
    let datasetDir: string = '';
    fs.readdirSync(WORKSPACE_DIR).forEach(dir => {
        if (dir == 'datasets') {
            datasetDir = WORKSPACE_DIR + "\\" + dir;
        }
    });
    if (datasetDir == '') {
        fs.mkdirSync(WORKSPACE_DIR + "\\datasets");
        datasetDir = WORKSPACE_DIR + "\\datasets";
    }
    return datasetDir;
}

/**
 * Retornar a implementação do dataset
 * @param server Server Config
 * @param dataset Nome do Dataset
 */
function loadDataset(server: any, dataset: string) {
    if (server) {
        const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
        const args = { companyId: server.company, username: server.user, password: server.pass, name: dataset };
        return new Promise((accept, reject) => {
            soap.createClient(url, function (err: any, client: any) {
                client.loadDataset(args, function (err: any, result: any) {
                    if (err) {
                        accept(null);
                    } else {
                        accept(result);
                    }
                });
            });
        });
    }
    return new Promise<boolean>((resolve, reject) => {
        return null;
    });
}

/**
 * Retorna todos os datasets do ambiente
 * @param server Server Config
 */
function getDatasets(server: any) {
    if (server) {
        const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
        const args = { companyId: server.company, username: server.user, password: server.pass };
        return new Promise((accept, reject) => {
            soap.createClient(url, function (err: any, client: any) {
                client.getAvailableDatasets(args, function (err: any, result: any) {
                    if (err) {
                        accept(null);
                    } else {
                        accept(result);
                    }
                });
            });
        });
    }
    return new Promise<boolean>((resolve, reject) => {
        return null;
    });
}

/**
 * Abre caixa de dialogo para selecionar um dataset
 * @param context Contexto
 */
async function selectDataset(context: ExtensionContext) {
    const TITLE = "Datasets";
    let allDatasets: QuickPickItem[] = [{ label: '' }];

    interface State {
        dataset: QuickPickItem | string;     
    }

    async function collectInputs() {
        const state = {} as Partial<State>;
        await MultiStepInput.run(input => pickDataset(input, state));
        return state as State;
    }

    async function pickDataset(input: MultiStepInput, state: Partial<State>) {
        const pick = await input.showQuickPick({
            title: TITLE,
            step: 1,
            totalSteps: 1,
            placeholder: 'Selecione o Dataset',
            items: allDatasets,
            activeItem: typeof state.dataset !== 'string' ? state.dataset : undefined,
            shouldResume: shouldResume,
            validate: validateDataset
        });
        state.dataset = pick;
    }

    function shouldResume() {
        return new Promise<boolean>((resolve, reject) => {
            return false;
        });
    }

    async function validateDataset(name: string) {
        let result = false;
        allDatasets.forEach((element) => {
            if (element.label === name) {
                result = true;
            }
        });
        return result;
    }

    async function main() {
        const serversConfig = Utils.getServersConfig();
        const currentServer = Utils.getCurrentServer();
        const server = Utils.getServerById(currentServer.id, serversConfig);
        let datasets: any = [];
        datasets = await getDatasets(server);
        allDatasets = datasets.datasets.item.map((element: any) => ({
            label: element.$value
        }));
        return await collectInputs();
    }
    return await main();
}