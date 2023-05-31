import * as vscode from 'vscode';
import * as ejs from 'ejs';
import path = require('path');
import { readFile } from 'fs/promises';
import { ListResponse, QueryInfo } from './models/cf';

export class WebviewController implements vscode.Disposable {
  private _panel: vscode.WebviewPanel | undefined;

  private _panels: {[key: string]: vscode.WebviewPanel | undefined};

  constructor(private baseUri: vscode.Uri) {
    this._panels = {};
  }

  init(title: string): void {
    if (title in this._panels) {
      this._panel = this._panels[title];
    }

    const viewType = "sql-content.output";
    const panel = vscode.window.createWebviewPanel(viewType, title, {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: true 
    });

    this._panel = this._panels[title] = panel;
    panel.onDidDispose(() => {
      console.info(`removing ${title} from panels`);
      delete this._panels[title];
    });
  }

  async render(title: string, response: ListResponse<QueryInfo<any> | QueryInfo<any>[]>): Promise<void> {
    this.init(title);

    let set: QueryInfo<any>[] = [];

    const query = response.result;
    if (!Array.isArray(query)) {
      set = [query];
    } else {
      set = query as QueryInfo<any>[];
    }

    const queries = set.map((query, idx) => {
      const index = idx,
        rows = query.results,
        duration = query.meta.duration,
        changes = query.meta.changes;

      let headers;
      if (query.results.length > 0) {
        headers = Object.keys(query.results[0]);
      }

      return { index, rows, headers, duration, changes };
    });

    const errors = response.errors;
    const now = new Date().toLocaleTimeString();
    const basehref = `${this._panel!.webview.asWebviewUri(vscode.Uri.joinPath(this.baseUri, "src"))}/`;
    const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
    const data = {
      now,
      queries,
      basehref,
      theme,
      errors
    };

    const fileUri = vscode.Uri.joinPath(
      vscode.extensions.getExtension("yawarjamal.cf-d1")!.extensionUri,
      "assets/sql-content.ejs"
    );
    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const formattedHTML = ejs.render(fileContent.toString(), data);

    if (!this._panel) {
      console.warn("no panel init for %s", title);
      return;
    }

    this._panel.webview.html = formattedHTML;
    this._panel.reveal();
  }

  dispose() {
    if (this._panel !== undefined) {
      this._panel.dispose();
      this._panel = undefined;
    }
  }
}