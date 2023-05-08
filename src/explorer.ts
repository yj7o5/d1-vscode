import * as vscode from 'vscode';
import { ExplorerService } from "./explorer-service";
import { TreeNode } from "./models/node";

export class ExplorerProvider implements vscode.TreeDataProvider<any> {
  private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
  readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

  private _explorerService: ExplorerService;

  constructor(explorerService: ExplorerService) {
    this._explorerService = explorerService;
  }

  refresh(node?: TreeNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(node: TreeNode): TreeNode {
    return node;
  }

  async getChildren(node?: TreeNode): Promise<vscode.TreeItem[] | undefined> {
    const children = await this._explorerService.getChildren(node);
    if (children) {
      const items = children.map(child => this.getTreeItem(child));
      return items;
    }
  }
}