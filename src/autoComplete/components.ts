import * as vscode from 'vscode';
export class FluigToastCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);

        if (!linePrefix.endsWith('FLUIGC.')) {
            return undefined;
        }
        const toast = new vscode.CompletionItem('toast', vscode.CompletionItemKind.Method);
        toast.insertText = new vscode.SnippetString(`toast({
    title: 'Toast title: ',
    message: 'My message',
    type: 'success'
});`);

        const modal = new vscode.CompletionItem('modal', vscode.CompletionItemKind.Method);
        modal.insertText = new vscode.SnippetString(`modal({
    title: 'Title',
    content: '<h1>Modal Content</h1>',
    id: 'fluig-modal',
    actions: [{
        'label': 'Save',
        'bind': 'data-open-modal',
    },{
        'label': 'Close',
        'autoClose': true
    }]
}, function(err, data) {
    if(err) {
        // do error handling
    } else {
        // do something with data
    }
});`);
        return [
            toast,
            modal,
        ];
    }

}