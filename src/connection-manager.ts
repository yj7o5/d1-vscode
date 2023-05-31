import * as vscode from "vscode";
import * as constants from "./constants";
import { Client } from "./client";
import { DatabaseItem } from "./models/cf";
import { TreeNode } from "./models/node";

export interface IConnectionProfile {
  name: string; 
  accountId: string;
  apiKey: string;
  email: string;
}

type ActiveProfile = {
  connection: IConnectionProfile,
  database: DatabaseItem
};

export class ConnectionManager {
  private _activeProfile: ActiveProfile|undefined;

  constructor(private _context: vscode.ExtensionContext) {}

  store(conn: IConnectionProfile) {
    const connections = this.loadAll();
    connections.push(conn);

    this._context.globalState.update(constants.connectionProfiles, connections);
  }

  async remove(idx: number) {
    let conns = this._context.globalState.get<IConnectionProfile[]>(constants.connectionProfiles);
    if (conns && idx < conns.length) {
      conns.splice(idx, 1);
      await this._context.globalState.update(constants.connectionProfiles, conns);
    }
  }

  loadAll(): IConnectionProfile[] {
    let conns = this._context.globalState.get<IConnectionProfile[]>(constants.connectionProfiles);
    if (conns === undefined) {
      return [];
    }

    return conns;
  }

  async addProfile(): Promise<IConnectionProfile> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Provide a Cloudflare API key (which has access to D1)",
      value: process.env.CF_API_KEY,
      password: true,
      ignoreFocusOut: true,
    });

    const accountId = await vscode.window.showInputBox({
      prompt: "Provide the account ID",
      value: process.env.CF_ACCOUNT_ID,
      password: true,
      ignoreFocusOut: true
    });

    const email = await vscode.window.showInputBox({
      prompt: "Provide your account email",
      value: process.env.CF_EMAIL,
      ignoreFocusOut: true
    });

    const name = await vscode.window.showInputBox({
      prompt: "Provide a friendly name",
      placeHolder: "[optional] Enter a display name for this account profile",
      value: "My D1 Databases",
      ignoreFocusOut: true
    });

    //TODO: check we can at-least make the connection with the given input fields
    const conn: IConnectionProfile = { 
      name: name!, 
      accountId: accountId!, 
      apiKey: apiKey!,
      email: email!
    };

    this.store(conn);

    return conn;
  }

  public async createDatabase(node: TreeNode): Promise<void> {
		const conn = node.data<IConnectionProfile>();
		const { accountId, apiKey,  email } = conn;
		const databaseName = await vscode.window.showInputBox({
			prompt: "Provide the new database name",
			// TODO: place some validation
			// validateInput: function(value: string) {}
		});

		await Client.createDatabase(accountId, apiKey, email, databaseName!);
  }

  public async chooseDatabase(): Promise<boolean> {
    const profiles = this.loadAll();
    const options = profiles.map(x => x.name);

    let selectedProfile: IConnectionProfile|undefined = profiles[0];
    if (profiles.length > 1) {
      const selectedOption = await vscode.window.showQuickPick(options, {
        canPickMany: false,
        placeHolder: "Select an account: "
      });

      selectedProfile = profiles.find(x => x.name === selectedOption);
      if (!selectedProfile) {
        return false;
      }
    }

    const databases = await Client.listDatabases(selectedProfile.accountId, selectedProfile.apiKey, selectedProfile.email, 1, 10);
    const databasesOptions = databases.map(x => x.name);

    const selectedDatabaseOption = await vscode.window.showQuickPick(databasesOptions, {
      canPickMany: false,
      placeHolder: `Choose a database from the list below(${selectedProfile.name} - Account): `
    });

    const selectedDatabase = databases.find(x => x.name === selectedDatabaseOption);
    if (!selectedDatabase) {
      return false;
    }

    this._activeProfile = {
      connection: selectedProfile,
      database: selectedDatabase
    };

    return true;
  }

  public get activeProfile(): ActiveProfile|undefined {
    return this._activeProfile;
  }
}