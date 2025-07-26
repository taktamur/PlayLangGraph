import { writeFileSync } from "node:fs";
import { CompiledGraph } from "@langchain/langgraph";

/**
 * グラフをPNG画像として保存する
 * @param app コンパイルされたStateGraph
 * @param filename 保存するファイル名（拡張子は不要）
 * @param outputPath 出力先のパス（デフォルトは現在のディレクトリ）
 */
export async function saveGraphAsPng(
  // deno-lint-ignore no-explicit-any
  app: CompiledGraph<any, any, any, any, any, any>,
  filename: string,
  outputPath: string = ".",
): Promise<void> {
  try {
    const graph = await app.getGraphAsync();
    const image = await graph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fullPath = `${outputPath}/${filename}.png`;
    writeFileSync(fullPath, new Uint8Array(arrayBuffer));
    console.log(`\nグラフ画像を ${fullPath} として保存しました`);
  } catch (error) {
    console.error("画像保存エラー:", error);
  }
}
