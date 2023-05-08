import * as vscode from "vscode";

export class TreeNode extends vscode.TreeItem {
  private _type: string;
  private _data: any;
  private _parent: TreeNode | undefined;
  private _index: number;

  constructor(
    index: number,
    type: string, 
    label: string, 
    contextValue: string, 
    data: any, 
    state: vscode.TreeItemCollapsibleState, 
    parent?: TreeNode) 
  {
    super(label, state);
    this._type = type;
    this._data = data;
    this._parent = parent;
    this._index = index;
    
    this.contextValue = contextValue;
    this.setIconPath(type);
  }

  setIconPath(type: string): void {
    switch (type) {
      case "account":
        this.iconPath = new vscode.ThemeIcon("account");
        break;
      case "database":
        this.iconPath = new vscode.ThemeIcon("database");
        break; 
      case "table":
        this.iconPath = new vscode.ThemeIcon("table");
        break;
      case "column":
        this.iconPath = new vscode.ThemeIcon("output");
        break;
      default:
        this.iconPath = vscode.ThemeIcon.File;
    }
  }

  public get type(): string {
    return this._type;
  }

  public get position(): number {
    return this._index;
  }

  public get parent(): TreeNode | undefined {
    return this._parent;
  }

  public data<T>(): T {
    return this._data as T;
  }

  public root<T>(type: string|undefined = undefined): T|undefined {
    if (type !== undefined) {
      if (this.type === type) {
        return this.data<T>();
      }
      let _parent = this._parent;
      while (_parent !== undefined && _parent.type !== type) {
        _parent = _parent.parent;
      }
      return _parent?.data<T>();
    }
    else {
      let _parent = this._parent;
      while (_parent !== undefined) {
        if(!_parent.parent) {
          return _parent.data<T>();
        }
        _parent = _parent.parent;
      }
    }
  }

  public get title(): string {
    const tokens = [(this._data as any).name];

    let parent = this._parent;
    while(parent !== undefined) {
      if (parent?.data !== undefined) {
        tokens.push(parent?.data<any>().name);
      }
      parent = parent?._data;
    }

    return tokens.join(".");
  }
}