import { ExtensionContext, QuickPickItem } from "vscode";
import Utils from "./utils";
import { MultiStepInput } from "./multiStepInput";
import { authenticate } from "./servers";

export async function serverSelect(context: ExtensionContext, serverParam: any) {
    const TITLE = "Conexão";
    const serversConfig = Utils.getServersConfig();

    interface State {
        title: string;
        server: QuickPickItem | string;
        environment: QuickPickItem | string;
        username: string;
        password: string;
    }

    const servers: QuickPickItem[] = serversConfig.configurations.map((element: any) => ({
        detail: element.id,
        label: element.name,
        description: `${element.address}:${element.port}`
    }));

    async function collectInputs() {
        const state = {} as Partial<State>;
        await MultiStepInput.run(input => pickServer(input, state, serversConfig));
        return state as State;
    }

    async function pickServer(input: MultiStepInput, state: Partial<State>, serversConfig: any) {
        const pick = await input.showQuickPick({
            title: TITLE,
            step: 1,
            totalSteps: 1,
            placeholder: 'Selecione servidor',
            items: servers,
            activeItem: typeof state.server !== 'string' ? state.server : undefined,
            shouldResume: shouldResume,
            validate: validateServerName,
        });
        state.server = pick;
    }

    function shouldResume() {
        return new Promise<boolean>((resolve, reject) => {
            return false;
        });
    }

    async function validateServerName(name: string) {
        let result = false;
        servers.forEach((element) => {
            if (element.label === name) {
                result = true;
            }
        });
        return result;
    }

    async function main() {
        const state = await collectInputs();
        const server: any = Utils.getServerById((typeof state.server !== 'string') ? (state.server.detail ? state.server.detail : "") : state.server, serversConfig);
        if (server) {
            server.label = server.name; //FIX: quebra-galho necessário para a árvore de servidores                    
            authenticate(server);
        }
    }

    main();
}