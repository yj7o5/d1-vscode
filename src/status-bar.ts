import * as vscode from "vscode";
import { cmdChooseDatabase, cmdExecuteQuery } from "./constants";

class StatusBar {
  private _dbItem: vscode.StatusBarItem;
  private _runItem: vscode.StatusBarItem;

  constructor() {
    this._dbItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
    this._runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
    
    this._dbItem.command = cmdChooseDatabase;
    this._runItem.command = cmdExecuteQuery;

    this._dbItem.show();

    this._runItem.show();
    this.setRunItemText("Run Query");
  }

  setDbItemText(text: string) {
    this._dbItem.text = `$(server) ${text} (D1)`;
  }

  setRunItemText(text: string) {
    this._runItem.text = `$(play) ${text} (D1)`;
  }
}

export default StatusBar;