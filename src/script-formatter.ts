import { ExplorerService } from "./explorer-service";
import { ColumnItem } from "./models/cf/columnItem";
import { TableItem } from "./models/cf/tableItem";
import { TreeNode } from "./models/node";

export class ScriptFormatter {
  private _explorer;

  constructor(explorer: ExplorerService) {
    this._explorer = explorer;
  }

  async selectScript(node: TreeNode): Promise<string> {
    const table = node.data<TableItem>();
    const columnNodes = await this._explorer.getChildren(node);
    const columnNames = columnNodes.map(x => x.data<ColumnItem>().name);
    const columnSpace = ",\n        ";

    return this.dedent(
     `SELECT
        ${columnNames.join(columnSpace)} 
      FROM
        ${table.name}
      LIMIT 100;
    `, 6);
  }

  private dedent(text: string, len: number): string {
    const lines = text.split("\n");

    return lines.map(line => line[0] !== " " ? line : line.substring(len)).join("\n");
  }
}