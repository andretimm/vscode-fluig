import * as vscode from 'vscode';

export class FluigCCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        if (linePrefix.toLocaleUpperCase().indexOf("FLU") != -1 ||
            linePrefix.toLocaleUpperCase().indexOf("FLUI") != -1 ||
            linePrefix.toLocaleUpperCase().indexOf("FLUIG") != -1 ||
            linePrefix.toLocaleUpperCase().indexOf("FLUIGC") != -1) {
            const FLUIGC = new vscode.CompletionItem('FLUIGC', vscode.CompletionItemKind.Class);
            FLUIGC.range = new vscode.Range(new vscode.Position(position.line, linePrefix.toLocaleUpperCase().indexOf("FLU")), position);
            FLUIGC.insertText = new vscode.SnippetString(`FLUIGC`);
            FLUIGC.detail = 'Helper para utilizar componentes do fluig.';
            FLUIGC.documentation = new vscode.MarkdownString("Por exemplo: ").appendCodeblock(`FLUIGC.toast({
                    message: 'Mensagem', 
                    type: 'danger
                })`, "javascript");

            return [
                FLUIGC,
            ];

        } else {
            return undefined;
        }
    }

}