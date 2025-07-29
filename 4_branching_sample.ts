// deno run --allow-write --allow-env --allow-net 4_branching_sample.ts

// 分岐処理を行うLangGraphサンプル
// 入力の種類に応じて異なる処理パスを選択する
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { saveGraphAsPng } from "./lib/graph-utils.ts";

// Annotationを使った状態定義（最新の推奨方法）
const BranchingAnnotation = Annotation.Root({
  input: Annotation<string>(), // ユーザー入力
  inputType: Annotation<"number" | "text" | "unknown">(), // 入力の種類
  numberResult: Annotation<number | null>(), // 数値処理結果
  textResult: Annotation<string | null>(), // テキスト処理結果
  finalMessage: Annotation<string>(), // 最終メッセージ
  processLog: Annotation<string[]>(), // 処理ログ
});
type BranchingState = typeof BranchingAnnotation.State;

// 入力を分析して種類を判定するノード
function analyzeInputNode(state: BranchingState): Partial<BranchingState> {
  const input = state.input.trim();
  let inputType: "number" | "text" | "unknown";
  
  console.log(`入力分析中: "${input}"`);
  
  // 数値かどうかを判定
  if (!isNaN(Number(input)) && input !== "") {
    inputType = "number";
  } else if (input.length > 0) {
    inputType = "text";
  } else {
    inputType = "unknown";
  }
  
  const logMessage = `入力種別を判定: ${inputType}`;
  console.log(logMessage);
  
  return {
    inputType,
    processLog: [...state.processLog, logMessage],
  };
}

// 数値処理パス
function processNumberNode(state: BranchingState): Partial<BranchingState> {
  const number = Number(state.input);
  const result = number * number; // 平方を計算
  const logMessage = `数値処理: ${number} → ${result} (平方計算)`;
  
  console.log(logMessage);
  
  return {
    numberResult: result,
    processLog: [...state.processLog, logMessage],
  };
}

// テキスト処理パス
function processTextNode(state: BranchingState): Partial<BranchingState> {
  const text = state.input;
  const result = text.split("").reverse().join(""); // 文字列を逆順に
  const logMessage = `テキスト処理: "${text}" → "${result}" (逆順変換)`;
  
  console.log(logMessage);
  
  return {
    textResult: result,
    processLog: [...state.processLog, logMessage],
  };
}

// 不明な入力の処理パス
function processUnknownNode(state: BranchingState): Partial<BranchingState> {
  const logMessage = "未知の入力: 処理をスキップしました";
  
  console.log(logMessage);
  
  return {
    processLog: [...state.processLog, logMessage],
  };
}

// 最終結果をまとめるノード
function summarizeResultNode(state: BranchingState): Partial<BranchingState> {
  let finalMessage: string;
  
  switch (state.inputType) {
    case "number":
      finalMessage = `数値処理完了: ${state.input} の平方は ${state.numberResult} です`;
      break;
    case "text":
      finalMessage = `テキスト処理完了: "${state.input}" を逆順にした結果は "${state.textResult}" です`;
      break;
    case "unknown":
      finalMessage = "入力が不明のため、処理を実行できませんでした";
      break;
    default:
      finalMessage = "予期しないエラーが発生しました";
  }
  
  const logMessage = "結果をまとめました";
  console.log(logMessage);
  console.log(finalMessage);
  
  return {
    finalMessage,
    processLog: [...state.processLog, logMessage],
  };
}

// 分岐の判定関数
function decideBranchPath(state: BranchingState): "processNumber" | "processText" | "processUnknown" {
  console.log(`分岐判定: ${state.inputType} パスを選択`);
  
  switch (state.inputType) {
    case "number":
      return "processNumber";
    case "text":
      return "processText";
    default:
      return "processUnknown";
  }
}

// StateGraphをAnnotationで作成
const workflow = new StateGraph(BranchingAnnotation);

// ノードを追加
workflow.addNode("analyzeInput", analyzeInputNode);
workflow.addNode("processNumber", processNumberNode);
workflow.addNode("processText", processTextNode);
workflow.addNode("processUnknown", processUnknownNode);
workflow.addNode("summarizeResult", summarizeResultNode);

// 型推論に失敗するNODE名称を定数化
// deno-lint-ignore no-explicit-any
const NODE_ANALYZE = "analyzeInput" as any;
// deno-lint-ignore no-explicit-any
const NODE_PROCESS_NUMBER = "processNumber" as any;
// deno-lint-ignore no-explicit-any
const NODE_PROCESS_TEXT = "processText" as any;
// deno-lint-ignore no-explicit-any
const NODE_PROCESS_UNKNOWN = "processUnknown" as any;
// deno-lint-ignore no-explicit-any
const NODE_SUMMARIZE = "summarizeResult" as any;

// エッジを定義
workflow.addEdge(START, NODE_ANALYZE);

// 条件付きエッジ（分岐の制御）
workflow.addConditionalEdges(
  NODE_ANALYZE,
  decideBranchPath,
  {
    processNumber: NODE_PROCESS_NUMBER,
    processText: NODE_PROCESS_TEXT,
    processUnknown: NODE_PROCESS_UNKNOWN,
  },
);

// 各処理パスから最終結果へのエッジ
workflow.addEdge(NODE_PROCESS_NUMBER, NODE_SUMMARIZE);
workflow.addEdge(NODE_PROCESS_TEXT, NODE_SUMMARIZE);
workflow.addEdge(NODE_PROCESS_UNKNOWN, NODE_SUMMARIZE);

// 最終結果から終了へ
workflow.addEdge(NODE_SUMMARIZE, END);

// ワークフローをコンパイル
const app = workflow.compile();

// 複数のテストケースを実行する関数
async function runTestCase(input: string, caseNumber: number) {
  console.log(`\n=== テストケース ${caseNumber}: "${input}" ===`);
  
  // 初期状態を設定
  const initialState: BranchingState = {
    input,
    inputType: "unknown", // 初期値（分析で決定される）
    numberResult: null,
    textResult: null,
    finalMessage: "",
    processLog: [],
  };
  
  // グラフを実行
  const result = await app.invoke(initialState);
  
  console.log("\n処理結果:");
  console.log(`- 入力: "${result.input}"`);
  console.log(`- 種別: ${result.inputType}`);
  if (result.numberResult !== null) {
    console.log(`- 数値結果: ${result.numberResult}`);
  }
  if (result.textResult !== null) {
    console.log(`- テキスト結果: "${result.textResult}"`);
  }
  console.log(`- 最終メッセージ: ${result.finalMessage}`);
  
  console.log("\n処理ログ:");
  result.processLog.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log}`);
  });
}

// メイン関数
async function main() {
  console.log("LangGraph 分岐処理サンプル開始");
  console.log("入力の種類に応じて異なる処理パスを実行します");
  
  // 複数のテストケースを実行
  await runTestCase("42", 1);      // 数値入力
  await runTestCase("Hello", 2);   // テキスト入力
  await runTestCase("", 3);        // 空入力
  await runTestCase("3.14", 4);    // 小数点数
  
  console.log("\n" + "=".repeat(50));
  console.log("全テストケース完了");
  
  // PNG画像として保存
  await saveGraphAsPng(app, "4_branching");
}

if (import.meta.main) {
  main().catch(console.error);
}