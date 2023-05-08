import * as vscode from 'vscode';
import { ExplorerProvider } from './explorer';
import { ExplorerService } from './explorer-service';
import { TreeNode } from './models/node';
import { ScriptFormatter } from './script-formatter';
import { WebviewController } from './webview-controller';
import { config as configureDotEnv } from "dotenv";

import {
	cmdAddProfile,
	cmdSelectScript,
	cmdExecuteQuery,
	cmdCreateScript,
	cmdRemoveProfile,
	cmdCreateDatabase,
	cmdChooseDatabase
	// cmdInternalVscodeFormatDocument
} from './constants';
import { Client } from './client';
import { DatabaseItem } from './models/cf';
import { ConnectionManager, IConnectionProfile } from './connection-manager';
import StatusBar from './status-bar';

configureDotEnv({ path: ".env" });

class EntryController implements vscode.Disposable {
	private _disposables: vscode.Disposable[];
	private _explorer: ExplorerProvider;
	private _explorerService: ExplorerService;
	private _connManager: ConnectionManager;
	private _formatter: ScriptFormatter;
	private _view: WebviewController;
	private _statusBar: StatusBar;

	private refreshNode(node: TreeNode) { this._explorer.refresh(node); }

	constructor(context: vscode.ExtensionContext) {
		this._connManager = new ConnectionManager(context);
		this._explorerService = new ExplorerService(this.refreshNode.bind(this), this._connManager);
		this._explorer = new ExplorerProvider(this._explorerService);
		this._formatter = new ScriptFormatter(this._explorerService);
		this._view = new WebviewController(context.extensionUri); 
		this._statusBar = new StatusBar();

		this._disposables = [
			vscode.window.registerTreeDataProvider("objects", this._explorer),
			vscode.commands.registerCommand(cmdAddProfile, async () => this.addProfile()),
			vscode.commands.registerCommand(cmdRemoveProfile, (node: TreeNode) => this.removeProfile(node)),
			vscode.commands.registerCommand(cmdSelectScript, (node: TreeNode) => this.selectScript(node)),
			vscode.commands.registerCommand(cmdExecuteQuery, () => this.executeQuery(this._explorerService.currentNode![0])),
			vscode.commands.registerCommand(cmdChooseDatabase, () => this.chooseDatabase()),
			vscode.commands.registerCommand(cmdCreateDatabase, (node: TreeNode) => this.createDatabase(node)),
			vscode.commands.registerCommand(cmdCreateScript, () => this.createScript())
		];
	}

	private async chooseDatabase(): Promise<boolean> {
		const result = await this._connManager.chooseDatabase();
		if (!result) {
			vscode.window.showWarningMessage("Unable to select a database");
		}
		const profile = this._connManager.activeProfile;
		const text = `${profile?.connection.name} - ${profile?.database.name}`;
		this._statusBar.setDbItemText(text);
		return result;
	}

	private async createDatabase(node: TreeNode): Promise<void> {
		await this._connManager.createDatabase(node!);
		this._explorer.refresh();
	}

	private async addProfile(): Promise<void> {
		await this._explorerService.addNode();
		this._explorer.refresh();
	}

	private removeProfile(node?: TreeNode): void {
		if (!node) {
			return;
		}
		this._explorerService.removeNode(node);
		this._explorer.refresh();
	}

	private async executeQuery(node?: TreeNode): Promise<void> {
		if (node === undefined) {
			vscode.window.showInformationMessage(`${cmdExecuteQuery}: no table selected`);
			return;
		} 

		const sqlText = vscode.window.activeTextEditor?.document.getText()!;

		if (!this._connManager.activeProfile) {
			if (!await this.chooseDatabase()) {
				return;
			}
		}


		const conn = this._connManager.activeProfile!.connection; // node.root<IConnectionProfile>()!;
		const db = this._connManager.activeProfile!.database; // node.root<DatabaseItem>("database")!;

		const response = await Client.executeQuery(conn.accountId, conn.apiKey, conn.email, db.uuid, sqlText);

		const data = response.result;

		this._view.render(node.title, response);
	}

	private async createScript(): Promise<void> {
		await this.createDocument("CREATE TABLE");	
	}

	private async selectScript(node: TreeNode): Promise<void> {
		const scriptText = await this._formatter.selectScript(node);
		
		await this.createDocument(scriptText);

		await this.executeQuery(node);
	}

	private async createDocument(content: string): Promise<vscode.TextEditor> {
		const options = { viewColumn: vscode.ViewColumn.One, preserveFocus: false, preview: false };

		const document = await vscode.workspace.openTextDocument({ language: "sql", content: content });
		const editor = await vscode.window.showTextDocument(document, options);

		return editor;
	}

	/**
	 * disposes the controller
	 */
	dispose(): void {
		for(let disposable of this._disposables) {
			disposable.dispose();
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		new EntryController(context)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
