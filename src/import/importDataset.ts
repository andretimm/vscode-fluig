import { ExtensionContext, QuickPickItem } from "vscode";
import Utils from '../utils';
import { MultiStepInput } from "../multiStepInput";

const soap = require('soap');

export async function importDataset(context: ExtensionContext) {
    const datasetSelected = await selectDataset(context);
    console.log(datasetSelected);
}

function getDatasets(server: any) {
    if (server) {
        const url = `${server.address}:${server.port}/webdesk/ECMDatasetService?wsdl`;
        const args = { companyId: server.company, username: server.user, password: server.pass };
        return new Promise((accept, reject) => {
            soap.createClient(url, function (err, client) {
                client.getAvailableDatasets(args, function (err, result) {
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
        const datasets = await getDatasets(server);
        allDatasets = datasets.datasets.item.map(element => ({
            label: element.$value
        }));
        return await collectInputs();
    }
    return await main();
}