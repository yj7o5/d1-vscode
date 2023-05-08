import * as vscode from "vscode";
import { Client } from "./client";
import { TreeNode } from "./models/node";
import { DatabaseItem } from "./models/cf";
import { TableItem } from "./models/cf/tableItem";
import { ColumnItem } from "./models/cf/columnItem";
import { ConnectionManager, IConnectionProfile as IConnectionProfile } from "./connection-manager";

type OnNodeChange = (_: TreeNode) => void;

const COLLAPSED_STATE = vscode.TreeItemCollapsibleState.Collapsed;

export class ExplorerService {
  public rootNode: TreeNode | undefined;
  public currentNode: TreeNode[] | undefined;

  private _children: Map<TreeNode, TreeNode[]>;
  private _connManager: ConnectionManager;

  private _onChange: OnNodeChange;

  constructor(onChange: OnNodeChange, connManager: ConnectionManager) {
    this.currentNode = undefined;
    this._children = new Map<TreeNode, TreeNode[]>();
    this._connManager = connManager;
    this._onChange = onChange;
  }

  public async getChildren(node: TreeNode | undefined): Promise<TreeNode[]> {
    if (node) {
      this.currentNode = [node];
      const cachedNode = this._children.get(node);
      if (cachedNode) {
        return cachedNode;
      } else {
        await this.expandNode(node);
        return this._children.get(node)!;
      }
    } else {
      if (!this.currentNode) {
        const conns = this._connManager.loadAll();
        let currConn: IConnectionProfile[];
        if (conns !== undefined && conns.length > 0) {
          currConn = conns;
        } else {
          currConn = [await this._connManager.addProfile()];
       }

        this.currentNode = currConn.map((x, idx) => 
          new TreeNode(idx, "account", x.name, "account", x, COLLAPSED_STATE));
      }
      
      return this.currentNode; 
    }
  }

  public async addNode(): Promise<void> {
    await this._connManager.addProfile();

    const nodes = this._connManager.loadAll();

    this.currentNode = nodes.map((x, idx) => 
      new TreeNode(idx, "account", x.name, "account", x, COLLAPSED_STATE)
    );
  }
  
  public async removeNode(node?: TreeNode): Promise<void> {
    if (!node) {
      console.warn("no node found to remove");
    }
    this._connManager.remove(node!.position);
    this._children.delete(node!);
    const idx = this.currentNode?.findIndex(x => x.label === node?.title);
    if (idx !== undefined && idx > -1) {
      this.currentNode?.splice(idx, 1);
    }
  }

  private async expandNode(node: TreeNode): Promise<void> {
    switch (node.type) {
      case "account":
        await this.expandProfile(node);
        break;
      case "database":
        await this.expandDatabase(node);
        break;
      case "table":
        await this.expandTable(node);
        break;
      default:
        return;
    }

    this._onChange(node);
  }

  private async expandProfile(node: TreeNode): Promise<void> {
    const profile = node.data<IConnectionProfile>();
    const databases = await Client.listDatabases(profile.accountId, profile.apiKey, profile.email, 1, 10);
    const children = databases.map((db, idx) => new TreeNode(idx, "database", db.name, "[contextValue]", db, vscode.TreeItemCollapsibleState.Collapsed, node));

    this._children.set(node, children);
  }

  private async expandDatabase(node: TreeNode): Promise<void> {
    const db = node.data<DatabaseItem>();
    const sql = `select name from sqlite_schema where type='table' and name not like 'sqlite_%'`;

    const conn = node.root<IConnectionProfile>()!;
    const response = await Client.executeQuery<TableItem>(conn.accountId, conn.apiKey, conn.email, db.uuid, sql);

    const tables = response.result.flatMap(x => x.results);
    const children = tables.map((table, idx) => new TreeNode(idx, "table", table.name, "table", table, vscode.TreeItemCollapsibleState.Collapsed, node));

    this._children.set(node, children);
  }

  private async expandTable(node: TreeNode): Promise<void> {
    const table = node.data<TableItem>();
    const sql = `select * from pragma_table_info('${table.name}')`;

    const dbId = node.root<DatabaseItem>("database")!.uuid;
    const conn = node.root<IConnectionProfile>()!;
    const response = await Client.executeQuery<ColumnItem>(conn.accountId, conn.apiKey, conn.email, dbId, sql);

    const columns = response.result.flatMap(x => x.results);
    const children = columns.map((column, idx) => new TreeNode(idx, "column", this.columnLabel(column), "column", column, vscode.TreeItemCollapsibleState.None, node));

    this._children.set(node, children);
  }

  private columnLabel(item: ColumnItem): string {
    const type = item.type.toLowerCase();
    const nullText = item.notnull === 0 ? "null" : "";

    let display = item.name;
    const props = [type];

    if (nullText !== "") {
      props.push(nullText);
    }
    if (item.pk === 1) {
      props.push("pk");
    }

    display = `${display} (${props.join(", ")})`;

    return display;
  }
}