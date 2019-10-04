import * as vscode from 'vscode';
import * as fs from 'fs';
import Utils from '../utils';
import { updateStatusBarItem } from '../servers';

export function exportDataset(context: any, files: any) {
    if (files) {
        const fileList: string[] = getListOfFiles(files);
        const server = Utils.getCurrentServer();                
        console.log(fileList);
        console.log(server);
        //TODO : Exportar dataset
    } else {
        vscode.window.showErrorMessage("Nenhum arquivo selecionado");
    }
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